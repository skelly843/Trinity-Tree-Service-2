-- supabase/migrations/016_customer_access.sql
-- Tightens what customers can reach, so each customer sees only what the office shares:
-- 1. Private files (customer-files, receipts buckets): staff keep their access; a customer can
--    open a file only when it is attached to a document or receipt shared with them.
--    Before, a customer could open or list every file in their folder, shared or not.
-- 2. Invoice line items of draft invoices are hidden from customers, like the invoices.
-- 3. Service requests can only be attached to the sender's own customer record.
-- Run after 015_service_radius.sql. Safe to run more than once.

-- True when the signed-in customer has been sent this file through Documents or Receipts
create or replace function public.customer_can_read_file(p_bucket text, p_name text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_customer_id() is not null and (
    exists (
      select 1 from public.documents d
      where d.customer_id = public.current_customer_id()
        and d.is_visible_to_customer = true
        and d.file_url = 'storage://' || p_bucket || '/' || p_name
    )
    or exists (
      select 1 from public.receipts r
      where r.customer_id = public.current_customer_id()
        and r.is_visible_to_customer = true
        and r.receipt_file_url = 'storage://' || p_bucket || '/' || p_name
    )
  );
$$;

revoke all on function public.customer_can_read_file(text, text) from public, anon;
grant execute on function public.customer_can_read_file(text, text) to authenticated;

-- Staff access to a customer's folder; folders that are not a customer ID (such as company
-- expense receipts) are left to the owner's own policy
create or replace function public.staff_can_read_folder(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_admin() and case
    when (storage.foldername(p_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.can_access_customer(((storage.foldername(p_name))[1])::uuid)
    else false
  end;
$$;

revoke all on function public.staff_can_read_folder(text) from public, anon;
grant execute on function public.staff_can_read_folder(text) to authenticated;

drop policy if exists "Authorized users read private files" on storage.objects;
create policy "Authorized users read private files" on storage.objects for select to authenticated
  using (
    bucket_id in ('customer-files', 'receipts')
    and (public.staff_can_read_folder(name) or public.customer_can_read_file(bucket_id, name))
  );

drop policy if exists "Authorized users select invoice items" on public.invoice_items;
create policy "Authorized users select invoice items" on public.invoice_items for select to authenticated
  using (exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id
      and (public.can_manage_customer(i.customer_id) or (i.status <> 'draft' and i.customer_id = public.current_customer_id()))
  ));

drop policy if exists "Public inserts service requests" on public.service_requests;
create policy "Public inserts service requests" on public.service_requests for insert to anon, authenticated
  with check (
    (created_by is null or created_by = auth.uid())
    and (customer_id is null or customer_id = public.current_customer_id() or public.is_admin())
  );
