-- supabase/migrations/018_arborists_and_assistant.sql
-- 1. Staff on a visit or job can see and work with that customer: anyone assigned to the
--    customer, to one of their upcoming visits, or to one of their open jobs (not only the
--    customer's main arborist). So workers never have to ask where the next job is.
-- 2. Customers can see the names and photos of the staff assigned to them, so they know
--    who to expect. Nothing else about staff is shared.
-- 3. Settings and a daily question limit for the built-in help assistant.
-- Run after 017_employee_access_and_pay.sql. Safe to run more than once.

create or replace function public.can_manage_customer(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when p_customer_id is null then false
    when public.is_global_admin() then true
    when public.current_user_role() in ('admin', 'employee') then
      exists (select 1 from public.admin_customer_assignments aca where aca.admin_id = auth.uid() and aca.customer_id = p_customer_id)
      or exists (select 1 from public.customers c where c.id = p_customer_id and c.assigned_admin_id = auth.uid())
      or exists (
        select 1 from public.appointments a
        where a.customer_id = p_customer_id and a.assigned_admin_id = auth.uid()
          and a.status in ('pending', 'confirmed', 'in_progress')
      )
      or exists (
        select 1 from public.jobs j
        where j.customer_id = p_customer_id
          and j.status not in ('completed', 'cancelled')
          and (j.assigned_admin_id = auth.uid()
               or exists (select 1 from public.job_assignments ja where ja.job_id = j.id and ja.admin_id = auth.uid()))
      )
    else false
  end;
$$;

-- The staff a customer can expect: their main arborist, and whoever is on their upcoming
-- visits and open jobs. Only names and photos.
create or replace function public.customer_team()
returns table (kind text, ref_id uuid, staff_id uuid, full_name text, avatar_url text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (select public.current_customer_id() as cid)
  select 'primary', c.id, p.id, p.full_name, p.avatar_url
  from me join public.customers c on c.id = me.cid join public.profiles p on p.id = c.assigned_admin_id
  union all
  select 'visit', a.id, p.id, p.full_name, p.avatar_url
  from me join public.appointments a on a.customer_id = me.cid join public.profiles p on p.id = a.assigned_admin_id
  where a.status in ('pending', 'confirmed', 'in_progress')
  union all
  select 'job', j.id, p.id, p.full_name, p.avatar_url
  from me join public.jobs j on j.customer_id = me.cid join public.profiles p on p.id = j.assigned_admin_id
  where j.status not in ('completed', 'cancelled');
$$;
revoke all on function public.customer_team() from public, anon;
grant execute on function public.customer_team() to authenticated;

-- Help assistant settings, one row per person
create table if not exists public.assistant_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tips_enabled boolean not null default true,
  assistant_enabled boolean not null default true,
  updated_at timestamp with time zone not null default now()
);
alter table public.assistant_settings enable row level security;

drop policy if exists "Own assistant settings" on public.assistant_settings;
create policy "Own assistant settings" on public.assistant_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.assistant_settings from anon;
grant select, insert, update on public.assistant_settings to authenticated;

-- Staff keep the assistant and tips on for their first week; customers can silence it any time
create or replace function public.assistant_first_week_rule()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_created timestamp with time zone;
begin
  if new.tips_enabled and new.assistant_enabled then
    return new;
  end if;
  select role, created_at into v_role, v_created from public.profiles where id = new.user_id;
  if v_role <> 'customer' and v_created > now() - interval '7 days' then
    raise exception 'The assistant stays on for your first week. You can turn it off after %.', to_char(v_created + interval '7 days', 'Mon DD');
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists assistant_first_week_rule on public.assistant_settings;
create trigger assistant_first_week_rule before insert or update on public.assistant_settings
  for each row execute function public.assistant_first_week_rule();

-- Daily question count, so the assistant can't run up a large AI bill
create table if not exists public.assistant_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default current_date,
  questions integer not null default 0,
  primary key (user_id, day)
);
alter table public.assistant_usage enable row level security;
revoke all on public.assistant_usage from anon, authenticated;

create or replace function public.count_assistant_question()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in to use the assistant.';
  end if;
  insert into public.assistant_usage (user_id, day, questions)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set questions = public.assistant_usage.questions + 1
  returning questions into v_count;
  return v_count;
end;
$$;
revoke all on function public.count_assistant_question() from public, anon;
grant execute on function public.count_assistant_question() to authenticated;
