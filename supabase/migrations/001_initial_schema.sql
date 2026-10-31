-- supabase/migrations/001_initial_schema.sql
-- Complete Relational SQL Schema Setup & Verification for Aquaman Plumbing & General Contracting Business Portal

-- 1. PostgreSQL Extensions
create extension if not exists "uuid-ossp";

-- 2. Clean teardown to ensure pure idempotent setup if re-run
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 3. ENUMS
-- Note: Instead of custom enums that can complicate re-runs, we use check constraints.

-- 4. TABLES

-- Profiles Table (Linked to auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  role text check (role in ('global_admin', 'admin', 'employee', 'customer')) default 'customer',
  phone text,
  is_active boolean default true,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

-- Customers table
create table if not exists public.customers (
  id uuid default gen_random_uuid() primary key,
  first_name text not null,
  last_name text not null,
  business_name text,
  phone text,
  email text unique not null,
  billing_address text,
  preferred_contact_method text check (preferred_contact_method in ('email', 'phone', 'text')) default 'email',
  emergency_contact_info text,
  account_status text check (account_status in ('active', 'disabled')) default 'active',
  assigned_admin_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.customers enable row level security;

-- Admin Customer Assignments
create table if not exists public.admin_customer_assignments (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references public.profiles(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete cascade not null,
  assigned_at timestamp with time zone default now(),
  unique (admin_id, customer_id)
);

alter table public.admin_customer_assignments enable row level security;

-- Customer Properties table
create table if not exists public.customer_properties (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references public.customers(id) on delete cascade not null,
  property_type text check (property_type in ('primary_residence', 'rental_property', 'commercial_property', 'other')) default 'primary_residence',
  address_line text not null,
  city text not null,
  state text not null,
  zip_code text not null,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.customer_properties enable row level security;

-- Company Settings
create table if not exists public.company_settings (
  id text primary key,
  company_name text not null default 'Aquaman Services',
  phone text,
  email text,
  address text,
  business_hours jsonb default '[]'::jsonb,
  social_links jsonb default '{}'::jsonb,
  service_areas text[],
  emergency_service_notice text,
  logo_url text,
  favicon_url text,
  seo_title text,
  seo_description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.company_settings enable row level security;

-- Navigation Items
create table if not exists public.navigation_items (
  id uuid default gen_random_uuid() primary key,
  label text not null,
  url text not null,
  display_order integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

alter table public.navigation_items enable row level security;

-- Website Pages
create table if not exists public.website_pages (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  title text not null,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

alter table public.website_pages enable row level security;

-- Website Content Blocks
create table if not exists public.website_content_blocks (
  id uuid default gen_random_uuid() primary key,
  page_id uuid references public.website_pages(id) on delete cascade,
  block_key text not null,
  content_json jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default now()
);

alter table public.website_content_blocks enable row level security;

-- Page Sections System (Legacy site_content & page_sections fallback alignment)
create table if not exists public.page_sections (
  id uuid default gen_random_uuid() primary key,
  page text not null default 'home',
  section_type text not null,
  title text,
  subtitle text,
  body_content text,
  image_url text,
  button_label text,
  button_url text,
  display_order integer default 0,
  is_active boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.page_sections enable row level security;

-- Service Categories
create table if not exists public.service_categories (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  description text,
  created_at timestamp with time zone default now()
);

alter table public.service_categories enable row level security;

-- Services table
create table if not exists public.services (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique not null,
  short_description text,
  full_description text,
  price_range text,
  featured_image text,
  additional_images text[],
  is_published boolean default false,
  is_featured boolean default false,
  sort_order integer default 0,
  category text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.services enable row level security;

-- Gallery Albums Table
create table if not exists public.gallery_albums (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  created_at timestamp with time zone default now()
);

alter table public.gallery_albums enable row level security;

-- Gallery Items Table (Photos with before/after capability)
create table if not exists public.gallery_items (
  id uuid default gen_random_uuid() primary key,
  album_id uuid references public.gallery_albums(id) on delete set null,
  title text not null,
  description text,
  location text,
  service_category text,
  before_image text,
  after_image text,
  additional_images text[],
  completion_date date,
  is_featured boolean default false,
  is_published boolean default false,
  is_private boolean default false,
  customer_id uuid references public.customers(id) on delete set null,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.gallery_items enable row level security;

-- Contact Form Submissions
create table if not exists public.contact_submissions (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  phone text,
  message text not null,
  status text check (status in ('new', 'contacted', 'scheduled', 'completed', 'spam', 'archived')) default 'new',
  internal_notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.contact_submissions enable row level security;

-- Service Requests
create table if not exists public.service_requests (
  id uuid default gen_random_uuid() primary key,
  first_name text not null,
  last_name text not null,
  phone text,
  email text not null,
  address text not null,
  city text not null,
  state text not null,
  zip_code text not null,
  service_requested text not null,
  problem_description text,
  preferred_date date,
  preferred_time_window text check (preferred_time_window in ('morning', 'afternoon', 'evening', 'any_time')) default 'any_time',
  is_emergency boolean default false,
  permission_to_contact boolean default true,
  uploaded_photos text[],
  status text check (status in ('new', 'reviewed', 'scheduled', 'declined', 'cancelled')) default 'new',
  customer_id uuid references public.customers(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.service_requests enable row level security;

-- Appointments table
create table if not exists public.appointments (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references public.customers(id) on delete set null,
  property_id uuid references public.customer_properties(id) on delete set null,
  assigned_admin_id uuid references public.profiles(id) on delete set null,
  service_request_id uuid references public.service_requests(id) on delete set null,
  scheduled_at timestamp with time zone not null,
  duration_minutes integer default 60,
  status text check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')) default 'pending',
  service_type text not null,
  color text default '#3b82f6',
  is_all_day boolean default false,
  notes text,
  internal_notes text,
  total_price numeric,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.appointments enable row level security;

-- Jobs/Projects associated with Customers
create table if not exists public.jobs (
  id uuid default gen_random_uuid() primary key,
  job_number serial,
  customer_id uuid references public.customers(id) on delete cascade not null,
  property_id uuid references public.customer_properties(id) on delete set null,
  assigned_admin_id uuid references public.profiles(id) on delete set null,
  service_category text,
  title text not null,
  description text,
  status text check (status in ('lead', 'requested', 'inspection_scheduled', 'estimate_pending', 'estimate_sent', 'approved', 'scheduled', 'in_progress', 'waiting_on_parts', 'waiting_on_customer', 'completed', 'cancelled')) default 'lead',
  priority text check (priority in ('low', 'medium', 'high', 'emergency')) default 'medium',
  start_date date,
  estimated_completion_date date,
  actual_completion_date date,
  internal_notes text,
  customer_visible_summary text,
  estimated_labor numeric(10,2) default 0.00,
  estimated_materials numeric(10,2) default 0.00,
  final_labor numeric(10,2) default 0.00,
  final_materials numeric(10,2) default 0.00,
  total_amount numeric(10,2) default 0.00,
  payment_status text check (payment_status in ('unpaid', 'partially_paid', 'paid', 'refunded')) default 'unpaid',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.jobs enable row level security;

-- Job Assignments
create table if not exists public.job_assignments (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  admin_id uuid references public.profiles(id) on delete cascade not null,
  assigned_at timestamp with time zone default now(),
  unique (job_id, admin_id)
);

alter table public.job_assignments enable row level security;

-- Notes system
create table if not exists public.notes (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.profiles(id) on delete set null,
  customer_id uuid references public.customers(id) on delete cascade,
  property_id uuid references public.customer_properties(id) on delete cascade,
  service_request_id uuid references public.service_requests(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  content text not null,
  visibility text check (visibility in ('internal', 'customer_visible')) default 'internal',
  attachment_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.notes enable row level security;

-- Estimates
create table if not exists public.estimates (
  id uuid default gen_random_uuid() primary key,
  estimate_number serial,
  customer_id uuid references public.customers(id) on delete cascade not null,
  property_id uuid references public.customer_properties(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  status text check (status in ('draft', 'sent', 'viewed', 'approved', 'declined', 'expired', 'converted')) default 'draft',
  issue_date date default current_date,
  expiration_date date,
  labor_cost numeric(10,2) default 0.00,
  materials_cost numeric(10,2) default 0.00,
  taxes numeric(10,2) default 0.00,
  discounts numeric(10,2) default 0.00,
  subtotal numeric(10,2) default 0.00,
  total numeric(10,2) default 0.00,
  terms_conditions text,
  customer_notes text,
  internal_notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.estimates enable row level security;

-- Estimate Line Items
create table if not exists public.estimate_items (
  id uuid default gen_random_uuid() primary key,
  estimate_id uuid references public.estimates(id) on delete cascade not null,
  description text not null,
  quantity numeric(10,2) default 1.00,
  unit_price numeric(10,2) default 0.00,
  total_price numeric(10,2) default 0.00,
  created_at timestamp with time zone default now()
);

alter table public.estimate_items enable row level security;

-- Invoices table
create table if not exists public.invoices (
  id uuid default gen_random_uuid() primary key,
  invoice_number serial,
  customer_id uuid references public.customers(id) on delete cascade not null,
  property_id uuid references public.customer_properties(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  issue_date date default current_date,
  due_date date,
  status text check (status in ('draft', 'sent', 'partial', 'paid', 'overdue', 'void')) default 'draft',
  subtotal numeric(10,2) default 0.00,
  taxes numeric(10,2) default 0.00,
  discounts numeric(10,2) default 0.00,
  total numeric(10,2) default 0.00,
  amount_paid numeric(10,2) default 0.00,
  balance_due numeric(10,2) default 0.00,
  terms text,
  notes text,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.invoices enable row level security;

-- Invoice Items
create table if not exists public.invoice_items (
  id uuid default gen_random_uuid() primary key,
  invoice_id uuid references public.invoices(id) on delete cascade not null,
  description text not null,
  quantity numeric(10,2) default 1.00,
  unit_price numeric(10,2) default 0.00,
  total_price numeric(10,2) default 0.00,
  created_at timestamp with time zone default now()
);

alter table public.invoice_items enable row level security;

-- Payments
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references public.customers(id) on delete cascade not null,
  invoice_id uuid references public.invoices(id) on delete cascade not null,
  amount numeric(10,2) not null,
  payment_date date default current_date,
  payment_method text check (payment_method in ('cash', 'check', 'credit_card', 'bank_transfer', 'stripe', 'other')) not null,
  reference_number text,
  internal_notes text,
  created_at timestamp with time zone default now()
);

alter table public.payments enable row level security;

-- Receipts
create table if not exists public.receipts (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references public.customers(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  receipt_file_url text not null,
  amount numeric(10,2) not null,
  description text,
  receipt_date date default current_date,
  is_visible_to_customer boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.receipts enable row level security;

-- Expenses
create table if not exists public.expenses (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete set null,
  vendor text not null,
  amount numeric(10,2) not null,
  expense_date date default current_date,
  category text,
  description text,
  receipt_file_url text,
  internal_notes text,
  created_at timestamp with time zone default now()
);

alter table public.expenses enable row level security;

-- Documents
create table if not exists public.documents (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references public.customers(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  file_url text not null,
  file_name text not null,
  file_type text,
  is_private_customer boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.documents enable row level security;

-- Notifications
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  recipient_role text check (recipient_role in ('global_admin', 'admin', 'customer')),
  recipient_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.notifications enable row level security;

-- Audit Logging table
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_id uuid,
  target_type text,
  details jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

alter table public.audit_logs enable row level security;

-- site_content (Legacy Site Editor fallback)
create table if not exists public.site_content (
  id text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  content jsonb not null default '{}'::jsonb
);

alter table public.site_content enable row level security;


-- ==========================================
-- 5. SECURITY HELPER FUNCTIONS (SECURITY DEFINER)
-- ==========================================

create or replace function public.current_user_role()
returns text
language plpgsql security definer
set search_path = public
as $$
begin
  return (select role from public.profiles where id = auth.uid());
end;
$$;

create or replace function public.is_global_admin()
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  return (select role = 'global_admin' from public.profiles where id = auth.uid());
end;
$$;

create or replace function public.is_admin()
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  return (select role in ('global_admin', 'admin', 'employee') from public.profiles where id = auth.uid());
end;
$$;

create or replace function public.current_customer_id()
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_email text;
begin
  v_email := (select email from public.profiles where id = auth.uid());
  return (select id from public.customers where email = v_email);
end;
$$;

create or replace function public.can_access_customer(p_customer_id uuid)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  -- Global Admin gets access to all
  if (select role = 'global_admin' from public.profiles where id = auth.uid()) then
    return true;
  end if;

  -- Admin gets access if assigned
  if (select role in ('admin', 'employee') from public.profiles where id = auth.uid()) then
    return exists (
      select 1 from public.customers
      where id = p_customer_id and (assigned_admin_id = auth.uid() or assigned_admin_id is null)
    );
  end if;

  -- Customer gets access if matches their own customer profile
  return (select current_customer_id() = p_customer_id);
end;
$$;


-- ==========================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ==========================================

-- PROFILES
create policy "Anyone can read active profile info" on public.profiles for select using (true);
create policy "Users can update their own profile fields" on public.profiles for update using (auth.uid() = id)
  with check ((role = (select role from public.profiles where id = auth.uid())) or (select role = 'global_admin' from public.profiles where id = auth.uid()));
create policy "Global admin can do everything on profiles" on public.profiles for all using ((select role = 'global_admin' from public.profiles where id = auth.uid()));

-- CUSTOMERS
create policy "Admins can view and edit customers" on public.customers for all using ((select role in ('global_admin', 'admin', 'employee') from public.profiles where id = auth.uid()));
create policy "Customers can view own record" on public.customers for select using (email = (select email from public.profiles where id = auth.uid()));

-- CUSTOMER PROPERTIES
create policy "Admins can manage all properties" on public.customer_properties for all using ((select role in ('global_admin', 'admin', 'employee') from public.profiles where id = auth.uid()));
create policy "Customers can view own properties" on public.customer_properties for select using (customer_id = (select id from public.customers where email = (select email from public.profiles where id = auth.uid())));

-- COMPANY SETTINGS
create policy "Anyone can read company settings" on public.company_settings for select using (true);
create policy "Global admin can update company settings" on public.company_settings for all using ((select role = 'global_admin' from public.profiles where id = auth.uid()));

-- NAVIGATION ITEMS
create policy "Anyone can read active navigation" on public.navigation_items for select using (is_active = true);
create policy "Global admin can manage navigation" on public.navigation_items for all using ((select role = 'global_admin' from public.profiles where id = auth.uid()));

-- WEBSITE PAGES
create policy "Anyone can read active website pages" on public.website_pages for select using (is_active = true);
create policy "Global admin can manage website pages" on public.website_pages for all using ((select role = 'global_admin' from public.profiles where id = auth.uid()));

-- WEBSITE CONTENT BLOCKS
create policy "Anyone can read active content blocks" on public.website_content_blocks for select using (true);
create policy "Global admin can manage content blocks" on public.website_content_blocks for all using ((select role = 'global_admin' from public.profiles where id = auth.uid()));

-- PAGE SECTIONS
create policy "Anyone can read active sections" on public.page_sections for select using (is_active = true);
create policy "Global admin can manage page sections" on public.page_sections for all using ((select role = 'global_admin' from public.profiles where id = auth.uid()));

-- SERVICE CATEGORIES
create policy "Anyone can read service categories" on public.service_categories for select using (true);
create policy "Admins can manage service categories" on public.service_categories for all using ((select role in ('global_admin', 'admin') from public.profiles where id = auth.uid()));

-- SERVICES
create policy "Anyone can read published services" on public.services for select using (is_published = true or (select role in ('global_admin', 'admin') from public.profiles where id = auth.uid()));
create policy "Admins can manage services" on public.services for all using ((select role in ('global_admin', 'admin') from public.profiles where id = auth.uid()));

-- GALLERY ALBUMS
create policy "Anyone can read gallery albums" on public.gallery_albums for select using (true);
create policy "Admins can manage gallery albums" on public.gallery_albums for all using ((select role in ('global_admin', 'admin') from public.profiles where id = auth.uid()));

-- GALLERY ITEMS
create policy "Anyone can read public published gallery items" on public.gallery_items for select
  using ((is_published = true and is_private = false) or (select role in ('global_admin', 'admin') from public.profiles where id = auth.uid()) or (is_private = true and customer_id = (select id from public.customers where email = (select email from public.profiles where id = auth.uid()))));
create policy "Admins can manage gallery items" on public.gallery_items for all using ((select role in ('global_admin', 'admin') from public.profiles where id = auth.uid()));

-- CONTACT SUBMISSIONS
create policy "Anyone can insert contact submissions" on public.contact_submissions for insert with check (true);
create policy "Admins can view and edit submissions" on public.contact_submissions for all using ((select role in ('global_admin', 'admin') from public.profiles where id = auth.uid()));

-- SERVICE REQUESTS
create policy "Anyone can submit service requests" on public.service_requests for insert with check (true);
create policy "Users can view own service requests" on public.service_requests for select using (email = (select email from public.profiles where id = auth.uid()) or customer_id = (select id from public.customers where email = (select email from public.profiles where id = auth.uid())));
create policy "Admins can manage service requests" on public.service_requests for all using ((select role in ('global_admin', 'admin') from public.profiles where id = auth.uid()));

-- APPOINTMENTS
create policy "Admins can manage appointments" on public.appointments for all using ((select role in ('global_admin', 'admin', 'employee') from public.profiles where id = auth.uid()));
create policy "Customers can read own appointments" on public.appointments for select using (customer_id = (select id from public.customers where email = (select email from public.profiles where id = auth.uid())));

-- JOBS
create policy "Admins can manage all jobs" on public.jobs for all using ((select role in ('global_admin', 'admin', 'employee') from public.profiles where id = auth.uid()));
create policy "Customers can read own jobs" on public.jobs for select using (customer_id = (select id from public.customers where email = (select email from public.profiles where id = auth.uid())));

-- NOTES
create policy "Admins can manage all notes" on public.notes for all using ((select role in ('global_admin', 'admin', 'employee') from public.profiles where id = auth.uid()));
create policy "Customers can view customer visible notes related to them" on public.notes for select using (visibility = 'customer_visible' and customer_id = (select id from public.customers where email = (select email from public.profiles where id = auth.uid())));

-- ESTIMATES
create policy "Admins can manage estimates" on public.estimates for all using ((select role in ('global_admin', 'admin') from public.profiles where id = auth.uid()));
create policy "Customers can view own estimates" on public.estimates for select using (customer_id = (select id from public.customers where email = (select email from public.profiles where id = auth.uid())));

-- ESTIMATE ITEMS
create policy "Admins can manage estimate items" on public.estimate_items for all using ((select role in ('global_admin', 'admin') from public.profiles where id = auth.uid()));
create policy "Customers can view own estimate items" on public.estimate_items for select using (exists (select 1 from public.estimates where estimates.id = estimate_items.estimate_id and estimates.customer_id = (select id from public.customers where email = (select email from public.profiles where id = auth.uid()))));

-- INVOICES
create policy "Admins can manage invoices" on public.invoices for all using ((select role in ('global_admin', 'admin') from public.profiles where id = auth.uid()));
create policy "Customers can view own invoices" on public.invoices for select using (customer_id = (select id from public.customers where email = (select email from public.profiles where id = auth.uid())));

-- INVOICE ITEMS
create policy "Admins can manage invoice items" on public.invoice_items for all using ((select role in ('global_admin', 'admin') from public.profiles where id = auth.uid()));
create policy "Customers can view own invoice items" on public.invoice_items for select using (exists (select 1 from public.invoices where invoices.id = invoice_items.invoice_id and invoices.customer_id = (select id from public.customers where email = (select email from public.profiles where id = auth.uid()))));

-- PAYMENTS
create policy "Admins can manage payments" on public.payments for all using ((select role in ('global_admin', 'admin') from public.profiles where id = auth.uid()));
create policy "Customers can read own payments" on public.payments for select using (customer_id = (select id from public.customers where email = (select email from public.profiles where id = auth.uid())));

-- RECEIPTS
create policy "Global admins can manage all receipts" on public.receipts for all using ((select role = 'global_admin' from public.profiles where id = auth.uid()));
create policy "Admins can manage receipts" on public.receipts for all using ((select role in ('global_admin', 'admin') from public.profiles where id = auth.uid()));
create policy "Customers can view visible receipts" on public.receipts for select using (is_visible_to_customer = true and customer_id = (select id from public.customers where email = (select email from public.profiles where id = auth.uid())));

-- EXPENSES
create policy "Only global admins can manage all expenses" on public.expenses for all using ((select role = 'global_admin' from public.profiles where id = auth.uid()));
create policy "Admins can manage job-related expenses" on public.expenses for all using ((select role in ('global_admin', 'admin') from public.profiles where id = auth.uid()));

-- DOCUMENTS
create policy "Admins can manage documents" on public.documents for all using ((select role in ('global_admin', 'admin') from public.profiles where id = auth.uid()));
create policy "Customers can view shared documents" on public.documents for select using (is_private_customer = false and customer_id = (select id from public.customers where email = (select email from public.profiles where id = auth.uid())));

-- NOTIFICATIONS
create policy "Users can manage own notifications" on public.notifications for all using (recipient_id = auth.uid() or recipient_role = (select role from public.profiles where id = auth.uid()));

-- AUDIT LOGS
create policy "Global admins can view audit logs" on public.audit_logs for select using ((select role = 'global_admin' from public.profiles where id = auth.uid()));
create policy "Global admins can create audit logs" on public.audit_logs for insert with check ((select role = 'global_admin' from public.profiles where id = auth.uid()));


-- ==========================================
-- 7. TRIGGERS & FUNCTIONS
-- ==========================================

-- Function to handle new user signup automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role, is_active)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'customer', -- STRICTLY defaults to customer
    true
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ==========================================
-- 8. INITIAL SEED DATA
-- ==========================================

-- Default Company Settings
insert into public.company_settings (id, company_name, phone, email, address, seo_title, seo_description)
values (
  'default',
  'Aquaman Plumbing & General Contracting',
  '1-800-555-PLUM',
  'contact@aquamanservices.com',
  '123 Waterway Ln, Ocean City, CA 90210',
  'Aquaman Plumbing & Contracting | Professional Plumbers',
  'Expert plumbing, drain cleaning, kitchen & bathroom remodeling, and general contracting services.'
) on conflict (id) do nothing;

-- Default Website Pages
insert into public.website_pages (slug, title)
values
('home', 'Home'),
('services', 'Services'),
('gallery', 'Gallery'),
('about', 'About Us'),
('contact', 'Contact Us'),
('request-service', 'Book a Service')
on conflict (slug) do nothing;

-- Default Service Categories
insert into public.service_categories (name, description)
values
('Plumbing', 'General residential and commercial plumbing repairs'),
('Emergency Plumbing', 'Rapid response active leak, sewer, and hot water heater failures'),
('Water Heaters', 'Traditional tank and modern tankless system installations & diagnostic'),
('Drain and Sewer', 'Sewer camera inspections and high-pressure hydro-jetting cleanouts'),
('Leak Detection', 'Precision sonic testing and active piping leak detection'),
('Bathroom Remodeling', 'High-end tiling, bathtub refitting, and full bathroom remodels'),
('Kitchen Remodeling', 'Custom cabinets, plumbing lines rerouting, and structural building'),
('General Contracting', 'Structural renovations, drywall, painting, and construction'),
('Residential Repairs', 'Quick home plumbing tuneups, faucet fittings, and toilet installs'),
('Commercial Services', 'Heavy-duty commercial building pipe upgrades and grease trap maintenance')
on conflict (name) do nothing;

-- Default Services
insert into public.services (title, slug, short_description, full_description, price_range, is_published, is_featured, sort_order, category)
values
('Emergency Plumbing Repair', 'emergency-plumbing-repair', 'Rapid response plumbing repairs for leaks, bursts, and backups.', 'When plumbing disaster strikes, our rapid-response team is ready. We handle emergency sewer line back-ups, burst pipes, major active leaks, and failing hot water heaters 24/7.', 'Starting at $150', true, true, 10, 'Emergency Plumbing'),
('Water Heater Repair & Install', 'water-heater-repair-install', 'Professional traditional and tankless water heater upgrades.', 'Enjoy endless hot water and improved energy efficiency with our water heater replacement service. We install all major brands, including tankless systems and hybrid heat pump units.', 'Contact for Estimate', true, true, 20, 'Water Heaters'),
('Drain Cleaning & Sewer Repair', 'drain-cleaning-sewer-repair', 'Advanced hydro-jetting and rooter service for clear lines.', 'Slow or clogged drains? We use high-definition drain cameras to pinpoint blockages and high-pressure hydro-jetting or motorized augers to clean sewer lines completely.', 'Starting at $99', true, false, 30, 'Drain and Sewer'),
('Bathroom & Kitchen Remodeling', 'bathroom-kitchen-remodeling', 'Full-service kitchen and bath redesign, fixture upgrades, and plumbing.', 'Transform your kitchen or bathroom into a modern sanctuary. From custom tiling and cabinet installs to rerouting water supply, framing, and drywall, we manage the entire project.', 'Free Estimate', true, true, 40, 'Bathroom Remodeling')
on conflict (slug) do nothing;

-- Default Homepage content blocks
insert into public.site_content (id, content) values (
  'homepage_hero',
  '{
    "title": "Premium Water & General Contracting Solutions",
    "subtitle": "Professional plumbing maintenance, drain cleaning, fixture installations, and full home remodeling. Fully insured experts at your service.",
    "ctaText": "Book a Service",
    "backgroundImage": ""
  }'::jsonb
) on conflict (id) do nothing;

-- Insert navigation items
insert into public.navigation_items (label, url, display_order, is_active)
values
('Services', '/services', 10, true),
('Gallery', '/gallery', 20, true),
('About', '/about', 30, true),
('Contact', '/contact', 40, true)
on conflict do nothing;

-- Insert page sections for homepage system
insert into public.page_sections (page, section_type, title, subtitle, body_content, button_label, button_url, display_order, is_active)
values
('home', 'hero', 'Premium Water & Contracting Solutions', 'Serving Ocean City & Surrounding Areas', 'We provide professional plumbing maintenance, fast leak repairs, and full-scale home construction, kitchen remodeling, and general contracting services.', 'Request Service', '/request-service', 10, true),
('home', 'why_choose_us', 'Why Choose Aquaman Contracting', 'The Preferred Choice for Homeowners', 'Certified & fully insured specialists. Easy online scheduling & payment. Transparent pricing, no hidden fees.', 'Learn More', '/about', 20, true)
on conflict do nothing;


-- ==========================================
-- 9. VERIFICATION QUERIES & TESTS
-- ==========================================

-- Test Queries to run in dashboard:
-- select count(*) from public.profiles;
-- select count(*) from public.services;
-- select current_user_role();
