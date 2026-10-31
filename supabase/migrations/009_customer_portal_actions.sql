-- supabase/migrations/009_customer_portal_actions.sql
-- Customer portal actions, without a payment processor:
--   * new customer accounts wait for global admin approval (profiles.is_active)
--   * customers approve or decline estimates that were sent to them
--   * customers report a payment; staff confirm it before the invoice changes
--   * customers add their own properties and send messages
--   * customers no longer see draft estimates or invoices
-- Run after 008_private_staff_notes.sql. Safe to run more than once.

-- ==========================================
-- 1. ACCOUNT APPROVAL
-- ==========================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    'customer',
    false
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==========================================
-- 2. WHAT CUSTOMERS CAN SEE AND ADD
-- ==========================================

drop policy if exists "Authorized users select estimates" on public.estimates;
create policy "Authorized users select estimates" on public.estimates for select to authenticated
  using (public.can_manage_customer(customer_id) or (status <> 'draft' and customer_id = public.current_customer_id()));

drop policy if exists "Authorized users select invoices" on public.invoices;
create policy "Authorized users select invoices" on public.invoices for select to authenticated
  using (public.can_manage_customer(customer_id) or (status <> 'draft' and customer_id = public.current_customer_id()));

drop policy if exists "Customers add own properties" on public.customer_properties;
create policy "Customers add own properties" on public.customer_properties for insert to authenticated
  with check (customer_id = public.current_customer_id());

drop policy if exists "Customers send own messages" on public.notes;
create policy "Customers send own messages" on public.notes for insert to authenticated
  with check (author_id = auth.uid() and customer_id = public.current_customer_id() and visibility = 'customer_visible');

-- ==========================================
-- 3. ESTIMATE RESPONSES
-- ==========================================

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
  set status = p_decision, updated_at = now()
  where id = p_estimate_id
    and customer_id = public.current_customer_id()
    and status in ('sent', 'viewed');

  if not found then
    raise exception 'This estimate can no longer be changed.';
  end if;
end;
$$;

revoke all on function public.customer_respond_to_estimate(uuid, text) from public, anon;
grant execute on function public.customer_respond_to_estimate(uuid, text) to authenticated;

-- ==========================================
-- 4. REPORTED PAYMENTS
-- ==========================================

alter table public.payments add column if not exists status text not null default 'confirmed';
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check (status in ('pending', 'confirmed', 'rejected'));

create or replace function public.customer_report_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_method text,
  p_reference text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer uuid := public.current_customer_id();
  v_owed numeric;
begin
  if p_method not in ('cash', 'check', 'bank_transfer', 'other') then
    raise exception 'Choose a payment method.';
  end if;

  select greatest(i.total - i.amount_paid, 0) into v_owed
  from public.invoices i
  where i.id = p_invoice_id
    and i.customer_id = v_customer
    and i.status in ('sent', 'partial', 'overdue');

  if not found then
    raise exception 'This invoice cannot take a payment.';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > v_owed then
    raise exception 'Enter an amount up to the balance of %.', v_owed;
  end if;
  if exists (select 1 from public.payments p where p.invoice_id = p_invoice_id and p.status = 'pending') then
    raise exception 'A payment on this invoice is already waiting for review.';
  end if;

  insert into public.payments (customer_id, invoice_id, amount, payment_method, reference_number, status)
  values (v_customer, p_invoice_id, p_amount, p_method, nullif(btrim(p_reference), ''), 'pending');
end;
$$;

revoke all on function public.customer_report_payment(uuid, numeric, text, text) from public, anon;
grant execute on function public.customer_report_payment(uuid, numeric, text, text) to authenticated;

-- Only confirmed payments count toward an invoice
create or replace function public.sync_invoice_payments()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invoice uuid;
  v_paid numeric;
begin
  if tg_op = 'DELETE' then
    v_invoice := old.invoice_id;
  else
    v_invoice := new.invoice_id;
  end if;

  select coalesce(sum(p.amount), 0) into v_paid
  from public.payments p
  where p.invoice_id = v_invoice and p.status = 'confirmed';

  update public.invoices i
  set amount_paid = v_paid,
      balance_due = greatest(i.total - v_paid, 0),
      status = case
        when i.status = 'void' then i.status
        when i.total > 0 and v_paid >= i.total then 'paid'
        when v_paid > 0 then 'partial'
        when i.status in ('paid', 'partial') then 'sent'
        else i.status
      end,
      updated_at = now()
  where i.id = v_invoice;

  return null;
end;
$$;

revoke all on function public.sync_invoice_payments() from public, anon, authenticated;

drop trigger if exists sync_invoice_payments on public.payments;
create trigger sync_invoice_payments
  after insert or update of status, amount, invoice_id or delete on public.payments
  for each row execute function public.sync_invoice_payments();
