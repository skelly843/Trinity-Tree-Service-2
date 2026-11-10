-- supabase/migrations/017_employee_access_and_pay.sql
-- Part 1: employees reach only what daily work needs.
--   "Office" means the owner (global_admin) and admins. Employees keep their assigned
--   customers, appointments, jobs, estimates, notes and job files, but no longer see website
--   leads, every user's contact details, billing (invoices, payments, receipts), or website
--   content, and cannot delete records.
-- Part 2: worker pay. The owner records what each worker earns per job and every payout
--   (Zelle, Cash App, check, cash). Payouts are permanent: amounts are added up from the
--   earnings being paid rather than typed, the same transfer can't be recorded twice, a
--   mistake is voided with a reason (never deleted or edited), and workers can confirm
--   they received each payment.
-- Run after 016_customer_access.sql. Safe to run more than once.

-- ============ Part 1: employee access ============

create or replace function public.is_office()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_user_role() in ('global_admin', 'admin'), false);
$$;
revoke all on function public.is_office() from public;
grant execute on function public.is_office() to anon, authenticated;

-- Website leads and contact forms: office only
drop policy if exists "Admins select contact submissions" on public.contact_submissions;
create policy "Admins select contact submissions" on public.contact_submissions for select to authenticated using (public.is_office());
drop policy if exists "Admins update contact submissions" on public.contact_submissions;
create policy "Admins update contact submissions" on public.contact_submissions for update to authenticated using (public.is_office()) with check (public.is_office());

drop policy if exists "Authorized users select service requests" on public.service_requests;
create policy "Authorized users select service requests" on public.service_requests for select to authenticated
  using (
    (public.is_office() and (customer_id is null or public.can_access_customer(customer_id)))
    or (public.is_admin() and customer_id is not null and public.can_access_customer(customer_id))
    or created_by = auth.uid()
    or (customer_id is not null and customer_id = public.current_customer_id())
  );
drop policy if exists "Assigned admins update service requests" on public.service_requests;
create policy "Assigned admins update service requests" on public.service_requests for update to authenticated
  using ((public.is_office() and customer_id is null) or (public.is_admin() and customer_id is not null and public.can_manage_customer(customer_id)))
  with check ((public.is_office() and customer_id is null) or (public.is_admin() and customer_id is not null and public.can_manage_customer(customer_id)));

-- Everyone's contact details: office only (everyone still reads their own profile)
drop policy if exists "Admins select profiles" on public.profiles;
create policy "Admins select profiles" on public.profiles for select to authenticated using (public.is_office());

-- Customer records: employees read their assigned customers; only the office adds or edits them
drop policy if exists "Admins insert customers" on public.customers;
create policy "Admins insert customers" on public.customers for insert to authenticated with check (public.is_office());
drop policy if exists "Assigned admins update customers" on public.customers;
create policy "Assigned admins update customers" on public.customers for update to authenticated
  using (public.is_office() and public.can_manage_customer(id)) with check (public.is_office() and public.can_manage_customer(id));
drop policy if exists "Assigned admins delete customer properties" on public.customer_properties;
create policy "Assigned admins delete customer properties" on public.customer_properties for delete to authenticated
  using (public.is_office() and public.can_manage_customer(customer_id));

drop policy if exists "Admins insert notifications" on public.notifications;
create policy "Admins insert notifications" on public.notifications for insert to authenticated with check (public.is_office());

-- Billing: office only (customers still see their own sent invoices, payments and shared receipts)
drop policy if exists "Authorized users select invoices" on public.invoices;
create policy "Authorized users select invoices" on public.invoices for select to authenticated
  using ((public.is_office() and public.can_manage_customer(customer_id)) or (status <> 'draft' and customer_id = public.current_customer_id()));
drop policy if exists "Assigned admins insert invoices" on public.invoices;
create policy "Assigned admins insert invoices" on public.invoices for insert to authenticated
  with check (public.is_office() and public.can_manage_customer(customer_id));
drop policy if exists "Assigned admins update invoices" on public.invoices;
create policy "Assigned admins update invoices" on public.invoices for update to authenticated
  using (public.is_office() and public.can_manage_customer(customer_id)) with check (public.is_office() and public.can_manage_customer(customer_id));

drop policy if exists "Authorized users select invoice items" on public.invoice_items;
create policy "Authorized users select invoice items" on public.invoice_items for select to authenticated
  using (exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id
      and ((public.is_office() and public.can_manage_customer(i.customer_id)) or (i.status <> 'draft' and i.customer_id = public.current_customer_id()))
  ));
drop policy if exists "Assigned admins insert invoice items" on public.invoice_items;
create policy "Assigned admins insert invoice items" on public.invoice_items for insert to authenticated
  with check (public.is_office() and exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and public.can_manage_customer(i.customer_id)));
drop policy if exists "Assigned admins update invoice items" on public.invoice_items;
create policy "Assigned admins update invoice items" on public.invoice_items for update to authenticated
  using (public.is_office() and exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and public.can_manage_customer(i.customer_id)))
  with check (public.is_office() and exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and public.can_manage_customer(i.customer_id)));
drop policy if exists "Assigned admins delete invoice items" on public.invoice_items;
create policy "Assigned admins delete invoice items" on public.invoice_items for delete to authenticated
  using (public.is_office() and exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and public.can_manage_customer(i.customer_id)));

drop policy if exists "Authorized users select payments" on public.payments;
create policy "Authorized users select payments" on public.payments for select to authenticated
  using ((public.is_office() and public.can_manage_customer(customer_id)) or customer_id = public.current_customer_id());
drop policy if exists "Assigned admins insert payments" on public.payments;
create policy "Assigned admins insert payments" on public.payments for insert to authenticated
  with check (public.is_office() and public.can_manage_customer(customer_id));
drop policy if exists "Assigned admins update payments" on public.payments;
create policy "Assigned admins update payments" on public.payments for update to authenticated
  using (public.is_office() and public.can_manage_customer(customer_id)) with check (public.is_office() and public.can_manage_customer(customer_id));

drop policy if exists "Authorized users select receipts" on public.receipts;
create policy "Authorized users select receipts" on public.receipts for select to authenticated
  using (
    public.is_global_admin()
    or (public.is_office() and customer_id is not null and public.can_access_customer(customer_id))
    or (is_visible_to_customer = true and customer_id = public.current_customer_id())
  );
drop policy if exists "Assigned admins insert receipts" on public.receipts;
create policy "Assigned admins insert receipts" on public.receipts for insert to authenticated
  with check (public.is_office() and (customer_id is null or public.can_manage_customer(customer_id)));
drop policy if exists "Assigned admins update receipts" on public.receipts;
create policy "Assigned admins update receipts" on public.receipts for update to authenticated
  using (public.is_office() and (customer_id is null or public.can_manage_customer(customer_id)))
  with check (public.is_office() and (customer_id is null or public.can_manage_customer(customer_id)));

-- Shared documents: employees can add files for their assigned customers; general files are office only
drop policy if exists "Assigned admins insert documents" on public.documents;
create policy "Assigned admins insert documents" on public.documents for insert to authenticated
  with check (public.is_admin() and ((customer_id is null and public.is_office()) or (customer_id is not null and public.can_manage_customer(customer_id))));
drop policy if exists "Assigned admins update documents" on public.documents;
create policy "Assigned admins update documents" on public.documents for update to authenticated
  using (public.is_admin() and ((customer_id is null and public.is_office()) or (customer_id is not null and public.can_manage_customer(customer_id))))
  with check (public.is_admin() and ((customer_id is null and public.is_office()) or (customer_id is not null and public.can_manage_customer(customer_id))));

-- Deleting records: office only
drop policy if exists "Assigned admins delete appointments" on public.appointments;
create policy "Assigned admins delete appointments" on public.appointments for delete to authenticated
  using (public.is_global_admin() or (public.is_office() and ((assigned_admin_id = auth.uid()) or (customer_id is not null and public.can_manage_customer(customer_id)))));
drop policy if exists "Assigned admins delete jobs" on public.jobs;
create policy "Assigned admins delete jobs" on public.jobs for delete to authenticated
  using (public.is_global_admin() or (public.is_office() and public.can_manage_customer(customer_id)));
drop policy if exists "Assigned admins delete estimates" on public.estimates;
create policy "Assigned admins delete estimates" on public.estimates for delete to authenticated
  using (public.is_office() and public.can_manage_customer(customer_id));
drop policy if exists "Assigned admins delete documents" on public.documents;
create policy "Assigned admins delete documents" on public.documents for delete to authenticated
  using (public.is_global_admin() or (public.is_office() and customer_id is not null and public.can_manage_customer(customer_id)));

-- Website content (services, gallery, photos): office only
drop policy if exists "Public reads published services" on public.services;
create policy "Public reads published services" on public.services for select to anon, authenticated using (is_published = true or public.is_office());
drop policy if exists "Admins insert services" on public.services;
create policy "Admins insert services" on public.services for insert to authenticated with check (public.is_office());
drop policy if exists "Admins update services" on public.services;
create policy "Admins update services" on public.services for update to authenticated using (public.is_office()) with check (public.is_office());
drop policy if exists "Admins delete services" on public.services;
create policy "Admins delete services" on public.services for delete to authenticated using (public.is_office());

drop policy if exists "Public reads active service categories" on public.service_categories;
create policy "Public reads active service categories" on public.service_categories for select to anon, authenticated using (is_active = true or public.is_office());
drop policy if exists "Admins insert service categories" on public.service_categories;
create policy "Admins insert service categories" on public.service_categories for insert to authenticated with check (public.is_office());
drop policy if exists "Admins update service categories" on public.service_categories;
create policy "Admins update service categories" on public.service_categories for update to authenticated using (public.is_office()) with check (public.is_office());
drop policy if exists "Admins delete service categories" on public.service_categories;
create policy "Admins delete service categories" on public.service_categories for delete to authenticated using (public.is_office());

drop policy if exists "Public reads published gallery albums" on public.gallery_albums;
create policy "Public reads published gallery albums" on public.gallery_albums for select to anon, authenticated using (is_published = true or public.is_office());
drop policy if exists "Admins insert gallery albums" on public.gallery_albums;
create policy "Admins insert gallery albums" on public.gallery_albums for insert to authenticated with check (public.is_office());
drop policy if exists "Admins update gallery albums" on public.gallery_albums;
create policy "Admins update gallery albums" on public.gallery_albums for update to authenticated using (public.is_office()) with check (public.is_office());
drop policy if exists "Admins delete gallery albums" on public.gallery_albums;
create policy "Admins delete gallery albums" on public.gallery_albums for delete to authenticated using (public.is_office());

drop policy if exists "Admins insert gallery filters" on public.gallery_filters;
create policy "Admins insert gallery filters" on public.gallery_filters for insert to authenticated with check (public.is_office());
drop policy if exists "Admins update gallery filters" on public.gallery_filters;
create policy "Admins update gallery filters" on public.gallery_filters for update to authenticated using (public.is_office()) with check (public.is_office());
drop policy if exists "Admins delete gallery filters" on public.gallery_filters;
create policy "Admins delete gallery filters" on public.gallery_filters for delete to authenticated using (public.is_office());
drop policy if exists "Admins tag gallery items" on public.gallery_item_filters;
create policy "Admins tag gallery items" on public.gallery_item_filters for insert to authenticated
  with check (public.is_office() and exists (select 1 from public.gallery_items gi where gi.id = gallery_item_filters.item_id));
drop policy if exists "Admins untag gallery items" on public.gallery_item_filters;
create policy "Admins untag gallery items" on public.gallery_item_filters for delete to authenticated using (public.is_office());

drop policy if exists "Public and authorized users read gallery items" on public.gallery_items;
create policy "Public and authorized users read gallery items" on public.gallery_items for select to anon, authenticated
  using ((is_published = true and is_private = false) or public.is_office() or (is_private = true and customer_id is not null and public.can_access_customer(customer_id)));
drop policy if exists "Admins insert gallery items" on public.gallery_items;
create policy "Admins insert gallery items" on public.gallery_items for insert to authenticated
  with check (public.is_office() and (customer_id is null or public.can_manage_customer(customer_id)));
drop policy if exists "Admins update gallery items" on public.gallery_items;
create policy "Admins update gallery items" on public.gallery_items for update to authenticated
  using (public.is_office() and (customer_id is null or public.can_manage_customer(customer_id)))
  with check (public.is_office() and (customer_id is null or public.can_manage_customer(customer_id)));
drop policy if exists "Admins delete gallery items" on public.gallery_items;
create policy "Admins delete gallery items" on public.gallery_items for delete to authenticated
  using (public.is_office() and (customer_id is null or public.can_manage_customer(customer_id)));

drop policy if exists "Admins upload website photos" on storage.objects;
create policy "Admins upload website photos" on storage.objects for insert to authenticated
  with check (bucket_id in ('public-site-images', 'images', 'gallery-images') and public.is_office());
drop policy if exists "Admins update website photos" on storage.objects;
create policy "Admins update website photos" on storage.objects for update to authenticated
  using (bucket_id in ('public-site-images', 'images', 'gallery-images') and public.is_office())
  with check (bucket_id in ('public-site-images', 'images', 'gallery-images') and public.is_office());
drop policy if exists "Admins delete website photos" on storage.objects;
create policy "Admins delete website photos" on storage.objects for delete to authenticated
  using (bucket_id in ('public-site-images', 'images', 'gallery-images') and public.is_office());

-- Private files: employees work with job files for their customers; receipts are office only
drop policy if exists "Authorized users read private files" on storage.objects;
create policy "Authorized users read private files" on storage.objects for select to authenticated
  using (
    (bucket_id = 'customer-files' and public.staff_can_read_folder(name))
    or (bucket_id = 'receipts' and public.is_office() and public.staff_can_read_folder(name))
    or (bucket_id in ('customer-files', 'receipts') and public.customer_can_read_file(bucket_id, name))
  );

-- ============ Part 2: worker pay ============

create table if not exists public.worker_payouts (
  id uuid default gen_random_uuid() primary key,
  worker_id uuid not null references public.profiles(id),
  amount numeric(10,2) not null check (amount > 0),
  method text not null check (method in ('zelle', 'cash_app', 'check', 'cash', 'other')),
  reference text,
  paid_on date not null default current_date,
  note text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamp with time zone not null default now(),
  worker_confirmed_at timestamp with time zone,
  voided_at timestamp with time zone,
  voided_by uuid references public.profiles(id),
  void_reason text,
  check (paid_on between date '2000-01-01' and current_date + 1),
  check (method in ('cash', 'other') or nullif(trim(reference), '') is not null),
  check (voided_at is null or nullif(trim(void_reason), '') is not null)
);

-- The same Zelle confirmation, Cash App ID or check number can't be recorded twice
create unique index if not exists worker_payouts_unique_reference
  on public.worker_payouts (method, lower(trim(reference)))
  where voided_at is null and nullif(trim(reference), '') is not null;
create index if not exists worker_payouts_worker_idx on public.worker_payouts (worker_id, paid_on desc);

create table if not exists public.worker_earnings (
  id uuid default gen_random_uuid() primary key,
  worker_id uuid not null references public.profiles(id),
  job_id uuid references public.jobs(id) on delete set null,
  description text not null check (length(trim(description)) > 0),
  amount numeric(10,2) not null check (amount > 0 and amount < 1000000),
  -- pending: job not finished yet; approved: earned and owed; void: entered by mistake
  status text not null default 'pending' check (status in ('pending', 'approved', 'void')),
  work_date date not null default current_date,
  payout_id uuid references public.worker_payouts(id),
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  check (payout_id is null or status = 'approved')
);
create index if not exists worker_earnings_worker_idx on public.worker_earnings (worker_id, status);
create index if not exists worker_earnings_job_idx on public.worker_earnings (job_id);

alter table public.worker_payouts enable row level security;
alter table public.worker_earnings enable row level security;

-- The owner sees everything; each worker sees only their own
drop policy if exists "Owner and worker read payouts" on public.worker_payouts;
create policy "Owner and worker read payouts" on public.worker_payouts for select to authenticated
  using (public.is_global_admin() or worker_id = auth.uid());
drop policy if exists "Owner and worker read earnings" on public.worker_earnings;
create policy "Owner and worker read earnings" on public.worker_earnings for select to authenticated
  using (public.is_global_admin() or worker_id = auth.uid());
drop policy if exists "Owner adds earnings" on public.worker_earnings;
create policy "Owner adds earnings" on public.worker_earnings for insert to authenticated
  with check (public.is_global_admin() and payout_id is null);
drop policy if exists "Owner edits unpaid earnings" on public.worker_earnings;
create policy "Owner edits unpaid earnings" on public.worker_earnings for update to authenticated
  using (public.is_global_admin() and payout_id is null) with check (public.is_global_admin() and payout_id is null);

-- Payouts are written only through the functions below; earnings are voided, never deleted
revoke all on public.worker_payouts from anon, authenticated;
grant select on public.worker_payouts to authenticated;
revoke all on public.worker_earnings from anon, authenticated;
grant select, insert, update on public.worker_earnings to authenticated;

-- Paid earnings and recorded payouts can't be changed or removed
create or replace function public.protect_worker_pay_records()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Pay records are permanent. Void the entry instead of deleting it.';
  end if;
  if tg_table_name = 'worker_payouts' then
    if new.worker_id is distinct from old.worker_id or new.amount is distinct from old.amount
       or new.method is distinct from old.method or new.reference is distinct from old.reference
       or new.paid_on is distinct from old.paid_on or new.created_at is distinct from old.created_at
       or new.created_by is distinct from old.created_by then
      raise exception 'A recorded payout can''t be changed. Void it and record it again.';
    end if;
    if old.voided_at is not null and new.voided_at is distinct from old.voided_at then
      raise exception 'This payout is already void.';
    end if;
  else
    if old.payout_id is not null and new.payout_id is not distinct from old.payout_id
       and (new.amount is distinct from old.amount or new.worker_id is distinct from old.worker_id
            or new.description is distinct from old.description or new.status is distinct from old.status
            or new.work_date is distinct from old.work_date or new.job_id is distinct from old.job_id) then
      raise exception 'This earning has been paid and can''t be changed. Void the payout first.';
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists protect_worker_payouts on public.worker_payouts;
create trigger protect_worker_payouts before update or delete on public.worker_payouts
  for each row execute function public.protect_worker_pay_records();
drop trigger if exists protect_worker_earnings on public.worker_earnings;
create trigger protect_worker_earnings before update or delete on public.worker_earnings
  for each row execute function public.protect_worker_pay_records();

-- Records a payout for chosen earnings. The amount is their total, so it can't be mistyped.
create or replace function public.record_worker_payout(
  p_worker uuid,
  p_earning_ids uuid[],
  p_method text,
  p_reference text,
  p_paid_on date,
  p_note text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ids uuid[];
  v_found int;
  v_amount numeric(10,2);
  v_payout uuid;
begin
  if not public.is_global_admin() then
    raise exception 'Only the owner can record payouts.';
  end if;
  if p_method in ('zelle', 'cash_app', 'check') and nullif(trim(p_reference), '') is null then
    raise exception 'Enter the Zelle confirmation number, Cash App payment ID or check number.';
  end if;
  if coalesce(p_paid_on, current_date) > current_date then
    raise exception 'The payment date can''t be in the future.';
  end if;
  if nullif(trim(p_reference), '') is not null and exists (
    select 1 from public.worker_payouts
    where method = p_method and lower(trim(reference)) = lower(trim(p_reference)) and voided_at is null
  ) then
    raise exception 'A payment with this reference number is already recorded.';
  end if;
  select array_agg(distinct x) into v_ids from unnest(p_earning_ids) x;
  if v_ids is null or array_length(v_ids, 1) = 0 then
    raise exception 'Choose at least one earning to pay.';
  end if;

  -- Lock the earnings so two people can't pay them at the same time
  perform 1 from public.worker_earnings where id = any(v_ids) for update;
  select count(*), sum(amount) into v_found, v_amount
  from public.worker_earnings
  where id = any(v_ids) and worker_id = p_worker and status = 'approved' and payout_id is null;
  if v_found <> array_length(v_ids, 1) then
    raise exception 'Some of these earnings are already paid, not yet approved, or belong to someone else. Refresh and try again.';
  end if;

  insert into public.worker_payouts (worker_id, amount, method, reference, paid_on, note, created_by)
  values (p_worker, v_amount, p_method, nullif(trim(p_reference), ''), coalesce(p_paid_on, current_date), nullif(trim(p_note), ''), auth.uid())
  returning id into v_payout;

  update public.worker_earnings set payout_id = v_payout where id = any(v_ids);

  insert into public.audit_logs (actor_id, action, target_id, target_type, details)
  values (auth.uid(), 'worker_payout_recorded', v_payout, 'worker_payout',
          jsonb_build_object('worker_id', p_worker, 'amount', v_amount, 'method', p_method, 'reference', nullif(trim(p_reference), ''), 'earnings', to_jsonb(v_ids)));
  return v_payout;
end;
$$;
revoke all on function public.record_worker_payout(uuid, uuid[], text, text, date, text) from public, anon;
grant execute on function public.record_worker_payout(uuid, uuid[], text, text, date, text) to authenticated;

-- Voids a payout recorded by mistake; its earnings become unpaid again. The record stays.
create or replace function public.void_worker_payout(p_payout uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_global_admin() then
    raise exception 'Only the owner can void payouts.';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'Give a reason for voiding this payout.';
  end if;
  update public.worker_payouts
  set voided_at = now(), voided_by = auth.uid(), void_reason = trim(p_reason)
  where id = p_payout and voided_at is null;
  if not found then
    raise exception 'That payout was not found or is already void.';
  end if;
  update public.worker_earnings set payout_id = null where payout_id = p_payout;
  insert into public.audit_logs (actor_id, action, target_id, target_type, details)
  values (auth.uid(), 'worker_payout_voided', p_payout, 'worker_payout', jsonb_build_object('reason', trim(p_reason)));
end;
$$;
revoke all on function public.void_worker_payout(uuid, text) from public, anon;
grant execute on function public.void_worker_payout(uuid, text) to authenticated;

-- The worker confirms the money arrived
create or replace function public.confirm_worker_payout(p_payout uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.worker_payouts
  set worker_confirmed_at = now()
  where id = p_payout and worker_id = auth.uid() and voided_at is null and worker_confirmed_at is null;
  if not found then
    raise exception 'That payment was not found or is already confirmed.';
  end if;
end;
$$;
revoke all on function public.confirm_worker_payout(uuid) from public, anon;
grant execute on function public.confirm_worker_payout(uuid) to authenticated;

-- When a job is marked completed, its pending earnings become owed
create or replace function public.approve_earnings_on_job_complete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update public.worker_earnings set status = 'approved' where job_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;
drop trigger if exists approve_earnings_on_job_complete on public.jobs;
create trigger approve_earnings_on_job_complete after update of status on public.jobs
  for each row execute function public.approve_earnings_on_job_complete();
