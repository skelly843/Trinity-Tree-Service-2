-- supabase/migrations/008_private_staff_notes.sql
-- Row level security controls whole rows, so a customer who can read their appointment,
-- job, estimate or payment could also read its internal_notes column. Internal notes now
-- live in a staff-only table. Triggers move anything written to internal_notes into that
-- table and leave the column on the customer-readable row empty.
-- Run after 007_security_hardening.sql. Safe to run more than once.

create table if not exists public.internal_record_notes (
  record_type text not null check (record_type in ('appointment', 'job', 'estimate', 'payment')),
  record_id uuid not null,
  internal_notes text not null,
  updated_at timestamp with time zone not null default now(),
  primary key (record_type, record_id)
);

alter table public.internal_record_notes enable row level security;

-- Staff read notes only on records their own access rules already let them see.
-- Writes go through the trigger below.
drop policy if exists "Staff read internal notes" on public.internal_record_notes;
create policy "Staff read internal notes" on public.internal_record_notes for select to authenticated
  using (
    public.is_admin() and case record_type
      when 'appointment' then exists (select 1 from public.appointments a where a.id = record_id)
      when 'job' then exists (select 1 from public.jobs j where j.id = record_id)
      when 'estimate' then exists (select 1 from public.estimates e where e.id = record_id)
      when 'payment' then exists (select 1 from public.payments p where p.id = record_id)
    end
  );

revoke all on public.internal_record_notes from anon;
grant select on public.internal_record_notes to authenticated;

create or replace function public.move_internal_notes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.internal_notes is not null then
    if btrim(new.internal_notes) = '' then
      delete from public.internal_record_notes
      where record_type = tg_argv[0] and record_id = new.id;
    else
      insert into public.internal_record_notes (record_type, record_id, internal_notes)
      values (tg_argv[0], new.id, new.internal_notes)
      on conflict (record_type, record_id) do update
      set internal_notes = excluded.internal_notes, updated_at = now();
    end if;
    new.internal_notes := null;
  end if;
  return new;
end;
$$;

create or replace function public.delete_internal_notes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.internal_record_notes
  where record_type = tg_argv[0] and record_id = old.id;
  return old;
end;
$$;

revoke all on function public.move_internal_notes() from public, anon, authenticated;
revoke all on function public.delete_internal_notes() from public, anon, authenticated;

do $$
declare
  t text;
  kind text;
begin
  for t, kind in values
    ('appointments', 'appointment'), ('jobs', 'job'), ('estimates', 'estimate'), ('payments', 'payment')
  loop
    execute format('drop trigger if exists move_internal_notes on public.%I', t);
    execute format('create trigger move_internal_notes before insert or update of internal_notes on public.%I for each row execute function public.move_internal_notes(%L)', t, kind);
    execute format('drop trigger if exists delete_internal_notes on public.%I', t);
    execute format('create trigger delete_internal_notes after delete on public.%I for each row execute function public.delete_internal_notes(%L)', t, kind);
    -- Moves any notes already saved
    execute format('update public.%I set internal_notes = internal_notes where internal_notes is not null', t);
  end loop;
end;
$$;
