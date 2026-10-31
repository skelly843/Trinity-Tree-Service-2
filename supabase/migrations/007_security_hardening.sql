-- supabase/migrations/007_security_hardening.sql
-- The complete access rules for the site, so a new company gets the same security as the
-- first live site, plus these fixes:
--   * deactivated staff lose access
--   * customer files and receipts stay limited to assigned staff and the global admin
--   * customer accounts link to their customer record once their email is confirmed
--   * a staff member who adds a customer is assigned to that customer
-- Run after 006_storage_buckets.sql. Safe to run more than once.
-- Tables named builder_* and media_*, and the website-media bucket, are left alone.

-- ==========================================
-- 1. COLUMNS THE RULES RELY ON
-- ==========================================

alter table public.profiles add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.service_categories add column if not exists is_active boolean not null default true;
alter table public.gallery_albums add column if not exists is_published boolean not null default true;
alter table public.service_requests add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.documents add column if not exists is_visible_to_customer boolean not null default false;
alter table public.gallery_albums add column if not exists sort_order integer not null default 0;
alter table public.gallery_albums add column if not exists updated_at timestamp with time zone not null default now();
alter table public.navigation_items add column if not exists updated_at timestamp with time zone not null default now();
alter table public.service_categories add column if not exists display_order integer not null default 0;
alter table public.service_categories add column if not exists updated_at timestamp with time zone not null default now();
alter table public.services add column if not exists category_id uuid references public.service_categories(id) on delete set null;
alter table public.website_content_blocks add column if not exists display_order integer not null default 0;
alter table public.website_content_blocks add column if not exists is_active boolean not null default true;
alter table public.website_content_blocks add column if not exists created_at timestamp with time zone not null default now();
alter table public.website_pages add column if not exists seo_title text;
alter table public.website_pages add column if not exists seo_description text;
alter table public.website_pages add column if not exists updated_at timestamp with time zone not null default now();

-- ==========================================
-- 2. ROLE HELPERS (a deactivated account has no role)
-- ==========================================

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and coalesce(is_active, false);
$$;

create or replace function public.is_global_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'global_admin', false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_user_role() in ('global_admin', 'admin', 'employee'), false);
$$;

create or replace function public.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.customer_id from public.profiles p
  where p.id = auth.uid() and p.is_active = true
  limit 1;
$$;

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
      exists (
        select 1 from public.admin_customer_assignments aca
        where aca.admin_id = auth.uid() and aca.customer_id = p_customer_id
      )
      or exists (
        select 1 from public.customers c
        where c.id = p_customer_id and c.assigned_admin_id = auth.uid()
      )
    else false
  end;
$$;

create or replace function public.can_access_customer(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when p_customer_id is null then false
    when public.current_user_role() = 'customer' then public.current_customer_id() = p_customer_id
    else public.can_manage_customer(p_customer_id)
  end;
$$;

grant execute on function public.current_user_role() to anon, authenticated;
grant execute on function public.is_global_admin() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.current_customer_id() to anon, authenticated;
grant execute on function public.can_access_customer(uuid) to anon, authenticated;
revoke all on function public.can_manage_customer(uuid) from public, anon;
grant execute on function public.can_manage_customer(uuid) to authenticated;

-- ==========================================
-- 3. TRIGGERS
-- ==========================================

-- Nobody can change their own role, customer link or active status
create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() = old.id and not public.is_global_admin() then
    if new.role is distinct from old.role
       or new.customer_id is distinct from old.customer_id
       or new.is_active is distinct from old.is_active then
      raise exception 'You cannot change your role, customer assignment, or account status.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_security_fields on public.profiles;
create trigger protect_profile_security_fields
  before update on public.profiles
  for each row execute function public.protect_profile_security_fields();

-- A customer account links to its customer record only after its email is confirmed
create or replace function public.link_confirmed_user_to_customer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.email_confirmed_at is not null then
    update public.profiles p
    set customer_id = (
      select c.id from public.customers c
      where lower(c.email) = lower(new.email)
      order by c.created_at
      limit 1
    )
    where p.id = new.id and p.customer_id is null and p.role = 'customer';
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_link_customer on auth.users;
create trigger on_auth_user_link_customer
  after insert or update of email_confirmed_at, email on auth.users
  for each row execute function public.link_confirmed_user_to_customer();

-- The same link when the customer record is added after the account exists
create or replace function public.link_customer_to_confirmed_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.email is not null then
    update public.profiles p
    set customer_id = new.id
    from auth.users u
    where u.id = p.id
      and lower(u.email) = lower(new.email)
      and u.email_confirmed_at is not null
      and p.customer_id is null
      and p.role = 'customer';
  end if;
  return new;
end;
$$;

drop trigger if exists link_customer_to_confirmed_user on public.customers;
create trigger link_customer_to_confirmed_user
  after insert or update of email on public.customers
  for each row execute function public.link_customer_to_confirmed_user();

-- Staff only see assigned customers, so a customer they add is assigned to them
create or replace function public.assign_customer_to_creator()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.assigned_admin_id is null and public.current_user_role() in ('admin', 'employee') then
    new.assigned_admin_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists assign_customer_to_creator on public.customers;
create trigger assign_customer_to_creator
  before insert on public.customers
  for each row execute function public.assign_customer_to_creator();

-- Trigger functions are never called directly
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_profile_security_fields() from public, anon, authenticated;
revoke all on function public.link_confirmed_user_to_customer() from public, anon, authenticated;
revoke all on function public.link_customer_to_confirmed_user() from public, anon, authenticated;
revoke all on function public.assign_customer_to_creator() from public, anon, authenticated;

-- Link accounts and customers that already exist
update public.profiles p
set customer_id = c.id
from auth.users u, public.customers c
where u.id = p.id
  and u.email_confirmed_at is not null
  and lower(c.email) = lower(u.email)
  and p.customer_id is null
  and p.role = 'customer';

-- ==========================================
-- 4. REPLACE EVERY RULE FOR THE SITE'S TABLES
-- ==========================================

do $$
declare
  p record;
begin
  for p in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename !~ '^(builder|media)'
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end;
$$;

-- Website content: visitors read it, the global admin changes it
do $$
declare
  t text;
  singular text;
begin
  for t, singular in values
    ('company_settings', 'company settings'), ('navigation_items', 'navigation'),
    ('page_sections', 'page sections'), ('site_content', 'site content'),
    ('website_content_blocks', 'content blocks'), ('website_pages', 'website pages'),
    ('global_styles', 'global styles'), ('page_blocks', 'page blocks')
  loop
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_global_admin())', 'Global admins insert ' || singular, t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_global_admin()) with check (public.is_global_admin())', 'Global admins update ' || singular, t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_global_admin())', 'Global admins delete ' || singular, t);
  end loop;
end;
$$;

create policy "Public reads company settings" on public.company_settings for select to anon, authenticated using (true);
create policy "Public reads site content" on public.site_content for select to anon, authenticated using (true);
create policy "Public reads global styles" on public.global_styles for select to anon, authenticated using (true);
create policy "Public reads page blocks" on public.page_blocks for select to anon, authenticated using (true);
create policy "Public reads active navigation" on public.navigation_items for select to anon, authenticated using (is_active = true or public.is_global_admin());
create policy "Public reads active page sections" on public.page_sections for select to anon, authenticated using (is_active = true or public.is_global_admin());
create policy "Public reads active content blocks" on public.website_content_blocks for select to anon, authenticated using (is_active = true or public.is_global_admin());
create policy "Public reads active website pages" on public.website_pages for select to anon, authenticated using (is_active = true or public.is_global_admin());

-- Services and gallery: visitors read what is published, staff manage it
do $$
declare
  t text;
  singular text;
begin
  for t, singular in values
    ('services', 'services'), ('service_categories', 'service categories'), ('gallery_albums', 'gallery albums')
  loop
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_admin())', 'Admins insert ' || singular, t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', 'Admins update ' || singular, t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin())', 'Admins delete ' || singular, t);
  end loop;
end;
$$;

create policy "Public reads published services" on public.services for select to anon, authenticated using (is_published = true or public.is_admin());
create policy "Public reads active service categories" on public.service_categories for select to anon, authenticated using (is_active = true or public.is_admin());
create policy "Public reads published gallery albums" on public.gallery_albums for select to anon, authenticated using (is_published = true or public.is_admin());

create policy "Public and authorized users read gallery items" on public.gallery_items for select to anon, authenticated
  using ((is_published = true and is_private = false) or public.is_admin() or (is_private = true and customer_id is not null and public.can_access_customer(customer_id)));
create policy "Admins insert gallery items" on public.gallery_items for insert to authenticated
  with check (public.is_admin() and (customer_id is null or public.can_manage_customer(customer_id)));
create policy "Admins update gallery items" on public.gallery_items for update to authenticated
  using (public.is_admin() and (customer_id is null or public.can_manage_customer(customer_id)))
  with check (public.is_admin() and (customer_id is null or public.can_manage_customer(customer_id)));
create policy "Admins delete gallery items" on public.gallery_items for delete to authenticated
  using (public.is_admin() and (customer_id is null or public.can_manage_customer(customer_id)));

-- Profiles
create policy "Profiles select own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Admins select profiles" on public.profiles for select to authenticated using (public.is_admin());
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Global admins update profiles" on public.profiles for update to authenticated using (public.is_global_admin()) with check (public.is_global_admin());
create policy "Global admins insert profiles" on public.profiles for insert to authenticated with check (public.is_global_admin());
create policy "Global admins delete profiles" on public.profiles for delete to authenticated using (public.is_global_admin());

-- Staff assignments
create policy "Admins view assignments" on public.admin_customer_assignments for select to authenticated using (public.is_global_admin() or (public.is_admin() and admin_id = auth.uid()));
create policy "Global admins insert assignments" on public.admin_customer_assignments for insert to authenticated with check (public.is_global_admin());
create policy "Global admins update assignments" on public.admin_customer_assignments for update to authenticated using (public.is_global_admin()) with check (public.is_global_admin());
create policy "Global admins delete assignments" on public.admin_customer_assignments for delete to authenticated using (public.is_global_admin());

-- Customers and their properties
create policy "Authorized users select customers" on public.customers for select to authenticated using (public.can_access_customer(id));
create policy "Admins insert customers" on public.customers for insert to authenticated with check (public.is_admin());
create policy "Assigned admins update customers" on public.customers for update to authenticated using (public.can_manage_customer(id)) with check (public.can_manage_customer(id));
create policy "Global admins delete customers" on public.customers for delete to authenticated using (public.is_global_admin());

create policy "Authorized users select customer properties" on public.customer_properties for select to authenticated using (public.can_access_customer(customer_id));
create policy "Assigned admins insert customer properties" on public.customer_properties for insert to authenticated with check (public.can_manage_customer(customer_id));
create policy "Assigned admins update customer properties" on public.customer_properties for update to authenticated using (public.can_manage_customer(customer_id)) with check (public.can_manage_customer(customer_id));
create policy "Assigned admins delete customer properties" on public.customer_properties for delete to authenticated using (public.can_manage_customer(customer_id));

-- Appointments
create policy "Authorized users select appointments" on public.appointments for select to authenticated
  using ((customer_id is not null and public.can_access_customer(customer_id)) or (public.is_admin() and assigned_admin_id = auth.uid()) or public.is_global_admin());
create policy "Assigned admins insert appointments" on public.appointments for insert to authenticated
  with check (public.is_admin() and (customer_id is null or public.can_manage_customer(customer_id)));
create policy "Assigned admins update appointments" on public.appointments for update to authenticated
  using (public.is_admin() and (public.is_global_admin() or assigned_admin_id = auth.uid() or (customer_id is not null and public.can_manage_customer(customer_id))))
  with check (public.is_admin() and (public.is_global_admin() or assigned_admin_id = auth.uid() or (customer_id is not null and public.can_manage_customer(customer_id))));
create policy "Assigned admins delete appointments" on public.appointments for delete to authenticated
  using (public.is_global_admin() or (public.is_admin() and (assigned_admin_id = auth.uid() or (customer_id is not null and public.can_manage_customer(customer_id)))));

-- Jobs
create policy "Authorized users select jobs" on public.jobs for select to authenticated
  using (public.can_access_customer(customer_id) or (public.is_admin() and assigned_admin_id = auth.uid()));
create policy "Assigned admins insert jobs" on public.jobs for insert to authenticated with check (public.can_manage_customer(customer_id));
create policy "Assigned admins update jobs" on public.jobs for update to authenticated
  using (public.can_manage_customer(customer_id) or (public.is_admin() and assigned_admin_id = auth.uid()))
  with check (public.can_manage_customer(customer_id) or (public.is_admin() and assigned_admin_id = auth.uid()));
create policy "Assigned admins delete jobs" on public.jobs for delete to authenticated using (public.is_global_admin() or public.can_manage_customer(customer_id));

create policy "Admins select job assignments" on public.job_assignments for select to authenticated
  using (public.is_global_admin() or (public.is_admin() and admin_id = auth.uid()) or exists (select 1 from public.jobs j where j.id = job_assignments.job_id and public.can_access_customer(j.customer_id)));
create policy "Assigned admins insert job assignments" on public.job_assignments for insert to authenticated
  with check (public.is_global_admin() or exists (select 1 from public.jobs j where j.id = job_assignments.job_id and public.can_manage_customer(j.customer_id)));
create policy "Global admins update job assignments" on public.job_assignments for update to authenticated using (public.is_global_admin()) with check (public.is_global_admin());
create policy "Global admins delete job assignments" on public.job_assignments for delete to authenticated using (public.is_global_admin());

-- Estimates
create policy "Authorized users select estimates" on public.estimates for select to authenticated using (public.can_access_customer(customer_id));
create policy "Assigned admins insert estimates" on public.estimates for insert to authenticated with check (public.can_manage_customer(customer_id));
create policy "Assigned admins update estimates" on public.estimates for update to authenticated using (public.can_manage_customer(customer_id)) with check (public.can_manage_customer(customer_id));
create policy "Assigned admins delete estimates" on public.estimates for delete to authenticated using (public.can_manage_customer(customer_id));

create policy "Authorized users select estimate items" on public.estimate_items for select to authenticated
  using (exists (select 1 from public.estimates e where e.id = estimate_items.estimate_id and public.can_access_customer(e.customer_id)));
create policy "Assigned admins insert estimate items" on public.estimate_items for insert to authenticated
  with check (exists (select 1 from public.estimates e where e.id = estimate_items.estimate_id and public.can_manage_customer(e.customer_id)));
create policy "Assigned admins update estimate items" on public.estimate_items for update to authenticated
  using (exists (select 1 from public.estimates e where e.id = estimate_items.estimate_id and public.can_manage_customer(e.customer_id)))
  with check (exists (select 1 from public.estimates e where e.id = estimate_items.estimate_id and public.can_manage_customer(e.customer_id)));
create policy "Assigned admins delete estimate items" on public.estimate_items for delete to authenticated
  using (exists (select 1 from public.estimates e where e.id = estimate_items.estimate_id and public.can_manage_customer(e.customer_id)));

-- Invoices and payments
create policy "Authorized users select invoices" on public.invoices for select to authenticated using (public.can_access_customer(customer_id));
create policy "Assigned admins insert invoices" on public.invoices for insert to authenticated with check (public.can_manage_customer(customer_id));
create policy "Assigned admins update invoices" on public.invoices for update to authenticated using (public.can_manage_customer(customer_id)) with check (public.can_manage_customer(customer_id));
create policy "Global admins delete invoices" on public.invoices for delete to authenticated using (public.is_global_admin());

create policy "Authorized users select invoice items" on public.invoice_items for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and public.can_access_customer(i.customer_id)));
create policy "Assigned admins insert invoice items" on public.invoice_items for insert to authenticated
  with check (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and public.can_manage_customer(i.customer_id)));
create policy "Assigned admins update invoice items" on public.invoice_items for update to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and public.can_manage_customer(i.customer_id)))
  with check (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and public.can_manage_customer(i.customer_id)));
create policy "Assigned admins delete invoice items" on public.invoice_items for delete to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and public.can_manage_customer(i.customer_id)));

create policy "Authorized users select payments" on public.payments for select to authenticated using (public.can_access_customer(customer_id));
create policy "Assigned admins insert payments" on public.payments for insert to authenticated with check (public.can_manage_customer(customer_id));
create policy "Assigned admins update payments" on public.payments for update to authenticated using (public.can_manage_customer(customer_id)) with check (public.can_manage_customer(customer_id));
create policy "Global admins delete payments" on public.payments for delete to authenticated using (public.is_global_admin());

-- Receipts and documents
create policy "Authorized users select receipts" on public.receipts for select to authenticated
  using (public.is_global_admin() or (public.is_admin() and customer_id is not null and public.can_access_customer(customer_id)) or (is_visible_to_customer = true and customer_id = public.current_customer_id()));
create policy "Assigned admins insert receipts" on public.receipts for insert to authenticated
  with check (public.is_admin() and (customer_id is null or public.can_manage_customer(customer_id)));
create policy "Assigned admins update receipts" on public.receipts for update to authenticated
  using (public.is_admin() and (customer_id is null or public.can_manage_customer(customer_id)))
  with check (public.is_admin() and (customer_id is null or public.can_manage_customer(customer_id)));
create policy "Global admins delete receipts" on public.receipts for delete to authenticated using (public.is_global_admin());

create policy "Authorized users select documents" on public.documents for select to authenticated
  using (public.is_global_admin() or (public.is_admin() and customer_id is not null and public.can_access_customer(customer_id)) or (is_visible_to_customer = true and customer_id = public.current_customer_id()));
create policy "Assigned admins insert documents" on public.documents for insert to authenticated
  with check (public.is_admin() and (customer_id is null or public.can_manage_customer(customer_id)));
create policy "Assigned admins update documents" on public.documents for update to authenticated
  using (public.is_admin() and (customer_id is null or public.can_manage_customer(customer_id)))
  with check (public.is_admin() and (customer_id is null or public.can_manage_customer(customer_id)));
create policy "Assigned admins delete documents" on public.documents for delete to authenticated
  using (public.is_global_admin() or (public.is_admin() and customer_id is not null and public.can_manage_customer(customer_id)));

-- Expenses
create policy "Global admins select expenses" on public.expenses for select to authenticated using (public.is_global_admin());
create policy "Admins insert job expenses" on public.expenses for insert to authenticated
  with check (public.is_global_admin() or (public.is_admin() and job_id is not null and exists (select 1 from public.jobs j where j.id = expenses.job_id and public.can_manage_customer(j.customer_id))));
create policy "Global admins update expenses" on public.expenses for update to authenticated using (public.is_global_admin()) with check (public.is_global_admin());
create policy "Global admins delete expenses" on public.expenses for delete to authenticated using (public.is_global_admin());

-- Notes
create policy "Authorized users select notes" on public.notes for select to authenticated
  using ((public.is_admin() and customer_id is not null and public.can_access_customer(customer_id)) or (visibility = 'customer_visible' and customer_id = public.current_customer_id()) or public.is_global_admin());
create policy "Assigned admins insert notes" on public.notes for insert to authenticated
  with check (public.is_admin() and author_id = auth.uid() and (customer_id is null or public.can_manage_customer(customer_id)));
create policy "Authors and global admins update notes" on public.notes for update to authenticated
  using (public.is_global_admin() or (author_id = auth.uid() and public.is_admin() and (customer_id is null or public.can_manage_customer(customer_id))))
  with check (public.is_global_admin() or (author_id = auth.uid() and public.is_admin() and (customer_id is null or public.can_manage_customer(customer_id))));
create policy "Authors and global admins delete notes" on public.notes for delete to authenticated
  using (public.is_global_admin() or (author_id = auth.uid() and public.is_admin()));

-- Public forms
create policy "Public inserts contact submissions" on public.contact_submissions for insert to anon, authenticated with check (true);
create policy "Admins select contact submissions" on public.contact_submissions for select to authenticated using (public.is_admin());
create policy "Admins update contact submissions" on public.contact_submissions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Global admins delete contact submissions" on public.contact_submissions for delete to authenticated using (public.is_global_admin());

create policy "Public inserts service requests" on public.service_requests for insert to anon, authenticated with check (created_by is null or created_by = auth.uid());
create policy "Authorized users select service requests" on public.service_requests for select to authenticated
  using ((public.is_admin() and (customer_id is null or public.can_access_customer(customer_id))) or created_by = auth.uid() or (customer_id is not null and customer_id = public.current_customer_id()));
create policy "Assigned admins update service requests" on public.service_requests for update to authenticated
  using (public.is_admin() and (customer_id is null or public.can_manage_customer(customer_id)))
  with check (public.is_admin() and (customer_id is null or public.can_manage_customer(customer_id)));
create policy "Global admins delete service requests" on public.service_requests for delete to authenticated using (public.is_global_admin());

-- Notifications, audit log and page history
create policy "Users select own notifications" on public.notifications for select to authenticated using (recipient_id = auth.uid() or public.is_global_admin());
create policy "Admins insert notifications" on public.notifications for insert to authenticated with check (public.is_admin());
create policy "Users update own notifications" on public.notifications for update to authenticated using (recipient_id = auth.uid() or public.is_global_admin()) with check (recipient_id = auth.uid() or public.is_global_admin());
create policy "Users delete own notifications" on public.notifications for delete to authenticated using (recipient_id = auth.uid() or public.is_global_admin());

create policy "Global admins select audit logs" on public.audit_logs for select to authenticated using (public.is_global_admin());
create policy "Admins insert audit logs" on public.audit_logs for insert to authenticated with check (public.is_admin() and actor_id = auth.uid());

create policy "Global admins read revisions" on public.content_revisions for select to authenticated using (public.is_global_admin());
create policy "Global admins insert revisions" on public.content_revisions for insert to authenticated with check (public.is_global_admin());
create policy "Global admins update revisions" on public.content_revisions for update to authenticated using (public.is_global_admin()) with check (public.is_global_admin());
create policy "Global admins delete revisions" on public.content_revisions for delete to authenticated using (public.is_global_admin());

-- ==========================================
-- 5. FILE STORAGE
-- ==========================================

do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname !~ 'website media'
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end;
$$;

-- Website photos: visible to anyone, managed by staff
create policy "Anyone can read website photos" on storage.objects for select
  using (bucket_id in ('public-site-images', 'images', 'gallery-images', 'profile-images'));
create policy "Admins upload website photos" on storage.objects for insert to authenticated
  with check (bucket_id in ('public-site-images', 'images', 'gallery-images') and public.is_admin());
create policy "Admins update website photos" on storage.objects for update to authenticated
  using (bucket_id in ('public-site-images', 'images', 'gallery-images') and public.is_admin())
  with check (bucket_id in ('public-site-images', 'images', 'gallery-images') and public.is_admin());
create policy "Admins delete website photos" on storage.objects for delete to authenticated
  using (bucket_id in ('public-site-images', 'images', 'gallery-images') and public.is_admin());

-- Profile photos: each user manages their own folder
create policy "Users insert own profile images" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-images' and (public.is_global_admin() or (storage.foldername(name))[1] = (auth.uid())::text));
create policy "Users update own profile images" on storage.objects for update to authenticated
  using (bucket_id = 'profile-images' and (public.is_global_admin() or (storage.foldername(name))[1] = (auth.uid())::text))
  with check (bucket_id = 'profile-images' and (public.is_global_admin() or (storage.foldername(name))[1] = (auth.uid())::text));
create policy "Users delete own profile images" on storage.objects for delete to authenticated
  using (bucket_id = 'profile-images' and (public.is_global_admin() or (storage.foldername(name))[1] = (auth.uid())::text));

-- Customer files and receipts: the global admin, plus assigned staff and the customer in
-- that customer's own folder
create policy "Global admins manage private files" on storage.objects for all to authenticated
  using (bucket_id in ('customer-files', 'receipts') and public.is_global_admin())
  with check (bucket_id in ('customer-files', 'receipts') and public.is_global_admin());
create policy "Authorized users read private files" on storage.objects for select to authenticated
  using (bucket_id in ('customer-files', 'receipts') and (storage.foldername(name))[1] is not null and public.can_access_customer(((storage.foldername(name))[1])::uuid));
create policy "Assigned staff upload private files" on storage.objects for insert to authenticated
  with check (bucket_id in ('customer-files', 'receipts') and public.is_admin() and (storage.foldername(name))[1] is not null and public.can_manage_customer(((storage.foldername(name))[1])::uuid));
create policy "Assigned staff update private files" on storage.objects for update to authenticated
  using (bucket_id in ('customer-files', 'receipts') and public.is_admin() and (storage.foldername(name))[1] is not null and public.can_manage_customer(((storage.foldername(name))[1])::uuid))
  with check (bucket_id in ('customer-files', 'receipts') and public.is_admin() and (storage.foldername(name))[1] is not null and public.can_manage_customer(((storage.foldername(name))[1])::uuid));
create policy "Assigned staff delete private files" on storage.objects for delete to authenticated
  using (bucket_id in ('customer-files', 'receipts') and public.is_admin() and (storage.foldername(name))[1] is not null and public.can_manage_customer(((storage.foldername(name))[1])::uuid));

update storage.buckets
set file_size_limit = 15728640, allowed_mime_types = array['image/*']
where id = 'images';

-- ==========================================
-- 6. VISITORS DO NOT NEED PROFILES
-- ==========================================

revoke select on public.profiles from anon;
