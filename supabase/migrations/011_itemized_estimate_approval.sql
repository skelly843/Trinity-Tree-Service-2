-- supabase/migrations/011_itemized_estimate_approval.sql
-- Customers approve or decline each line of an itemized estimate.
-- Safe to run more than once.

-- ==========================================
-- 1. LINE ITEM DECISIONS
-- ==========================================

alter table public.estimate_items add column if not exists sort_order integer not null default 0;
alter table public.estimate_items add column if not exists customer_decision text;
alter table public.estimate_items add column if not exists decided_at timestamp with time zone;
alter table public.estimate_items drop constraint if exists estimate_items_customer_decision_check;
alter table public.estimate_items add constraint estimate_items_customer_decision_check
  check (customer_decision in ('approved', 'declined'));

-- What the customer agreed to; equals total when every line is approved
alter table public.estimates add column if not exists approved_total numeric not null default 0;
alter table public.estimates drop constraint if exists estimates_approved_total_check;
alter table public.estimates add constraint estimates_approved_total_check check (approved_total >= 0);

alter table public.estimates drop constraint if exists estimates_status_check;
alter table public.estimates add constraint estimates_status_check
  check (status in ('draft', 'sent', 'viewed', 'approved', 'partially_approved', 'declined', 'expired', 'converted'));

create index if not exists estimate_items_estimate_order_idx on public.estimate_items (estimate_id, sort_order);

-- ==========================================
-- 2. CUSTOMERS SEE LINES ONLY ON ESTIMATES SENT TO THEM (not drafts)
-- ==========================================

drop policy if exists "Authorized users select estimate items" on public.estimate_items;
create policy "Authorized users select estimate items" on public.estimate_items for select to authenticated
  using (exists (
    select 1 from public.estimates e
    where e.id = estimate_items.estimate_id
      and (public.can_manage_customer(e.customer_id)
           or (e.status <> 'draft' and e.customer_id = public.current_customer_id()))
  ));

-- ==========================================
-- 3. CUSTOMER RESPONSE, LINE BY LINE
-- ==========================================

-- Every line not in p_approved_item_ids is declined. An empty list declines the estimate.
create or replace function public.customer_respond_to_estimate_items(p_estimate_id uuid, p_approved_item_ids uuid[])
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total_lines integer;
  v_approved_lines integer;
  v_approved_total numeric;
  v_status text;
begin
  perform 1 from public.estimates
  where id = p_estimate_id
    and customer_id = public.current_customer_id()
    and status in ('sent', 'viewed')
  for update;

  if not found then
    raise exception 'This estimate can no longer be changed.';
  end if;

  select count(*) into v_total_lines from public.estimate_items where estimate_id = p_estimate_id;
  if v_total_lines = 0 then
    raise exception 'This estimate has no line items to choose from.';
  end if;

  update public.estimate_items
  set customer_decision = case when id = any(coalesce(p_approved_item_ids, '{}')) then 'approved' else 'declined' end,
      decided_at = now()
  where estimate_id = p_estimate_id;

  select count(*), coalesce(sum(total_price), 0)
  into v_approved_lines, v_approved_total
  from public.estimate_items
  where estimate_id = p_estimate_id and customer_decision = 'approved';

  v_status := case
    when v_approved_lines = 0 then 'declined'
    when v_approved_lines = v_total_lines then 'approved'
    else 'partially_approved'
  end;

  update public.estimates
  set status = v_status, approved_total = v_approved_total, updated_at = now()
  where id = p_estimate_id;

  return v_status;
end;
$$;

revoke all on function public.customer_respond_to_estimate_items(uuid, uuid[]) from public, anon;
grant execute on function public.customer_respond_to_estimate_items(uuid, uuid[]) to authenticated;

-- Whole-estimate answers (estimates without line items) also record the approved amount
create or replace function public.customer_respond_to_estimate(p_estimate_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_decision not in ('approved', 'declined') then
    raise exception 'Choose approve or decline.';
  end if;

  update public.estimates
  set status = p_decision,
      approved_total = case when p_decision = 'approved' then total else 0 end,
      updated_at = now()
  where id = p_estimate_id
    and customer_id = public.current_customer_id()
    and status in ('sent', 'viewed');

  if not found then
    raise exception 'This estimate can no longer be changed.';
  end if;

  update public.estimate_items
  set customer_decision = p_decision, decided_at = now()
  where estimate_id = p_estimate_id;
end;
$$;

revoke all on function public.customer_respond_to_estimate(uuid, text) from public, anon;
grant execute on function public.customer_respond_to_estimate(uuid, text) to authenticated;
