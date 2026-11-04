-- supabase/full-setup.sql
-- Everything a new client project needs, in one file: migrations 001 to 009 in order.
-- Paste it into the Supabase SQL Editor of a new project and run it once.

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

-- supabase/migrations/002_website_builder.sql
-- Additive Schema to support visual website builder (WordPress/Wix style) for Aquaman Plumbing & General Contracting

-- 1. Create global_styles table
create table if not exists public.global_styles (
  id text primary key default 'default',
  logo_url text,
  favicon_url text,
  primary_color text default '#3b82f6', -- default blue-600
  secondary_color text default '#1e293b', -- default slate-800
  accent_color text default '#ef4444', -- default red-500
  heading_font text default 'Geist Sans',
  body_font text default 'Geist Sans',
  border_radius text default '0.75rem',
  max_width text default '1280px',
  updated_at timestamp with time zone default now()
);

alter table public.global_styles enable row level security;

-- 2. Create page_blocks table for flexible drag-and-drop page assembly
create table if not exists public.page_blocks (
  id uuid default gen_random_uuid() primary key,
  page_id text not null, -- 'home', 'about', 'contact', 'services', 'gallery'
  block_type text not null, -- 'hero', 'text_image', 'features', 'testimonials', 'spacer', etc.
  display_order integer default 0,
  is_visible boolean default true,
  draft_data jsonb default '{}'::jsonb not null,
  published_data jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.page_blocks enable row level security;

-- 3. Create content_revisions table for Undo/Redo/Restore version history
create table if not exists public.content_revisions (
  id uuid default gen_random_uuid() primary key,
  page_id text not null,
  blocks_snapshot jsonb not null, -- Snapshot of draft blocks
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default now()
);

alter table public.content_revisions enable row level security;


-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================

-- GLOBAL STYLES
create policy "Anyone can read global styles" on public.global_styles for select using (true);
create policy "Only global admins can update global styles" on public.global_styles for all
  using ((select role = 'global_admin' from public.profiles where id = auth.uid()));

-- PAGE BLOCKS
create policy "Anyone can read page blocks" on public.page_blocks for select using (true);
create policy "Only global admins can manage page blocks" on public.page_blocks for all
  using ((select role = 'global_admin' from public.profiles where id = auth.uid()));

-- CONTENT REVISIONS
create policy "Only global admins can select revisions" on public.content_revisions for select
  using ((select role = 'global_admin' from public.profiles where id = auth.uid()));
create policy "Only global admins can insert revisions" on public.content_revisions for insert
  with check ((select role = 'global_admin' from public.profiles where id = auth.uid()));


-- ==========================================
-- SEED INITIAL PAGE BLOCKS & STYLES
-- ==========================================

-- Insert default global styles
insert into public.global_styles (id, primary_color, secondary_color, accent_color, heading_font, body_font, border_radius)
values (
  'default',
  '#3b82f6',
  '#1e293b',
  '#ef4444',
  'Geist Sans',
  'Geist Sans',
  '0.75rem'
) on conflict (id) do nothing;

-- Seed default home page blocks
insert into public.page_blocks (page_id, block_type, display_order, is_visible, draft_data, published_data)
values
(
  'home',
  'hero',
  10,
  true,
  '{
    "title": "Premium Water & General Contracting Solutions",
    "subtitle": "Professional plumbing maintenance, fast leak repairs, custom bathroom & kitchen remodeling, and general contracting services. Fully insured experts at your service.",
    "ctaText": "Book a Service",
    "ctaUrl": "/request-service",
    "secondaryCtaText": "View Our Work",
    "secondaryCtaUrl": "/gallery",
    "backgroundImage": ""
  }'::jsonb,
  '{
    "title": "Premium Water & General Contracting Solutions",
    "subtitle": "Professional plumbing maintenance, fast leak repairs, custom bathroom & kitchen remodeling, and general contracting services. Fully insured experts at your service.",
    "ctaText": "Book a Service",
    "ctaUrl": "/request-service",
    "secondaryCtaText": "View Our Work",
    "secondaryCtaUrl": "/gallery",
    "backgroundImage": ""
  }'::jsonb
),
(
  'home',
  'features',
  20,
  true,
  '{
    "title": "Why Homeowners Trust Aquaman",
    "subtitle": "Our commitment to premium craftsmanship and customer service.",
    "items": [
      {"title": "Reliable Service", "desc": "Our technicians are certified and fully insured, ensuring your home is in safe hands."},
      {"title": "Easy Scheduling", "desc": "Book, reschedule, and track your appointments through our online portal."},
      {"title": "Transparent Pricing", "desc": "Get clear invoices and pay securely online. No hidden fees, ever."}
    ]
  }'::jsonb,
  '{
    "title": "Why Homeowners Trust Aquaman",
    "subtitle": "Our commitment to premium craftsmanship and customer service.",
    "items": [
      {"title": "Reliable Service", "desc": "Our technicians are certified and fully insured, ensuring your home is in safe hands."},
      {"title": "Easy Scheduling", "desc": "Book, reschedule, and track your appointments through our online portal."},
      {"title": "Transparent Pricing", "desc": "Get clear invoices and pay securely online. No hidden fees, ever."}
    ]
  }'::jsonb
) on conflict do nothing;

-- supabase/migrations/003_page_editor.sql
-- In-context page editor: page_blocks + content_revisions, global-admin-only writes,
-- public read grants, and default blocks for every public page.
-- Idempotent: safe to run more than once in the Supabase SQL Editor.

-- ==========================================
-- 1. SECURITY HELPERS (SECURITY DEFINER, so policies never re-enter profiles RLS)
-- ==========================================

create or replace function public.is_global_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'global_admin' and coalesce(is_active, false)
       from public.profiles
      where id = auth.uid()),
    false
  );
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

grant execute on function public.is_global_admin() to anon, authenticated;
grant execute on function public.current_user_role() to anon, authenticated;

-- The 001 profiles policies query profiles from inside a profiles policy, which
-- Postgres rejects with "infinite recursion detected in policy for relation profiles".
-- Re-create them on top of the security-definer helpers.
drop policy if exists "Global admin can do everything on profiles" on public.profiles;
create policy "Global admin can do everything on profiles" on public.profiles for all
  using (public.is_global_admin())
  with check (public.is_global_admin());

drop policy if exists "Users can update their own profile fields" on public.profiles;
create policy "Users can update their own profile fields" on public.profiles for update
  using (auth.uid() = id)
  with check (role = public.current_user_role() or public.is_global_admin());

-- ==========================================
-- 2. TABLES
-- ==========================================

create table if not exists public.global_styles (
  id text primary key default 'default',
  logo_url text,
  favicon_url text,
  primary_color text default '#3b82f6',
  secondary_color text default '#1e293b',
  accent_color text default '#ef4444',
  heading_font text default 'Geist Sans',
  body_font text default 'Geist Sans',
  border_radius text default '0.75rem',
  max_width text default '1280px',
  updated_at timestamp with time zone default now()
);

create table if not exists public.page_blocks (
  id uuid default gen_random_uuid() primary key,
  page_id text not null,
  block_type text not null,
  display_order integer default 0,
  is_visible boolean default true,
  draft_data jsonb default '{}'::jsonb not null,
  published_data jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists page_blocks_page_order_idx on public.page_blocks (page_id, display_order);

create table if not exists public.content_revisions (
  id uuid default gen_random_uuid() primary key,
  page_id text not null,
  blocks_snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default now()
);

alter table public.global_styles enable row level security;
alter table public.page_blocks enable row level security;
alter table public.content_revisions enable row level security;

-- ==========================================
-- 3. ROW LEVEL SECURITY
-- ==========================================

-- GLOBAL STYLES
drop policy if exists "Anyone can read global styles" on public.global_styles;
drop policy if exists "Only global admins can update global styles" on public.global_styles;
drop policy if exists "Global admins can insert global styles" on public.global_styles;
drop policy if exists "Global admins can update global styles" on public.global_styles;
drop policy if exists "Global admins can delete global styles" on public.global_styles;
create policy "Anyone can read global styles" on public.global_styles for select using (true);
create policy "Global admins can insert global styles" on public.global_styles for insert
  with check (public.is_global_admin());
create policy "Global admins can update global styles" on public.global_styles for update
  using (public.is_global_admin()) with check (public.is_global_admin());
create policy "Global admins can delete global styles" on public.global_styles for delete
  using (public.is_global_admin());

-- PAGE BLOCKS
drop policy if exists "Anyone can read page blocks" on public.page_blocks;
drop policy if exists "Only global admins can manage page blocks" on public.page_blocks;
drop policy if exists "Global admins can insert page blocks" on public.page_blocks;
drop policy if exists "Global admins can update page blocks" on public.page_blocks;
drop policy if exists "Global admins can delete page blocks" on public.page_blocks;
create policy "Anyone can read page blocks" on public.page_blocks for select using (true);
create policy "Global admins can insert page blocks" on public.page_blocks for insert
  with check (public.is_global_admin());
create policy "Global admins can update page blocks" on public.page_blocks for update
  using (public.is_global_admin()) with check (public.is_global_admin());
create policy "Global admins can delete page blocks" on public.page_blocks for delete
  using (public.is_global_admin());

-- CONTENT REVISIONS
drop policy if exists "Only global admins can select revisions" on public.content_revisions;
drop policy if exists "Only global admins can insert revisions" on public.content_revisions;
drop policy if exists "Global admins can read revisions" on public.content_revisions;
drop policy if exists "Global admins can insert revisions" on public.content_revisions;
drop policy if exists "Global admins can update revisions" on public.content_revisions;
drop policy if exists "Global admins can delete revisions" on public.content_revisions;
create policy "Global admins can read revisions" on public.content_revisions for select
  using (public.is_global_admin());
create policy "Global admins can insert revisions" on public.content_revisions for insert
  with check (public.is_global_admin());
create policy "Global admins can update revisions" on public.content_revisions for update
  using (public.is_global_admin()) with check (public.is_global_admin());
create policy "Global admins can delete revisions" on public.content_revisions for delete
  using (public.is_global_admin());

-- STORAGE: "Replace photo" uploads into the existing public-site-images bucket
drop policy if exists "Anyone can read public site images" on storage.objects;
drop policy if exists "Global admins can upload public site images" on storage.objects;
drop policy if exists "Global admins can update public site images" on storage.objects;
drop policy if exists "Global admins can delete public site images" on storage.objects;
create policy "Anyone can read public site images" on storage.objects for select
  using (bucket_id = 'public-site-images');
create policy "Global admins can upload public site images" on storage.objects for insert
  with check (bucket_id = 'public-site-images' and public.is_global_admin());
create policy "Global admins can update public site images" on storage.objects for update
  using (bucket_id = 'public-site-images' and public.is_global_admin())
  with check (bucket_id = 'public-site-images' and public.is_global_admin());
create policy "Global admins can delete public site images" on storage.objects for delete
  using (bucket_id = 'public-site-images' and public.is_global_admin());

-- ==========================================
-- 4. GRANTS (RLS still decides which rows each role can touch)
-- ==========================================

grant select on public.page_blocks to anon, authenticated;
grant all on public.page_blocks, public.content_revisions to authenticated;
grant select on public.global_styles to anon, authenticated;
grant all on public.global_styles to authenticated;

grant select on public.services, public.gallery_items, public.site_content,
  public.company_settings, public.profiles, public.navigation_items to anon;

-- ==========================================
-- 5. DEFAULT BLOCKS (only for pages that have no blocks yet)
-- Generated from src/components/blocks/defaultPages.json
-- ==========================================

insert into public.global_styles (id) values ('default') on conflict (id) do nothing;

-- home
insert into public.page_blocks (page_id, block_type, display_order, is_visible, draft_data, published_data)
select 'home', v.block_type, v.display_order, true, v.data, v.data
from (values
  ('hero', 10, $json${"variant":"large","title":"Premium Plumbing & General Contracting","subtitle":"Expert maintenance, urgent emergency dispatch, and custom remodeling services at your fingertips. Manage operations through our live client portal.","ctaText":"Book a Service","ctaUrl":"/request-service","secondaryCtaText":"View Our Work","secondaryCtaUrl":"/gallery","backgroundImage":""}$json$::jsonb),
  ('features', 20, $json${"title":"Why Aquaman Contracting is Rated #1","subtitle":"Our primary design values","items":[{"icon":"shield","title":"Licensed & Fully Insured","desc":"Our technicians are certified plumbing engineers and General B contractors who respect your property."},{"icon":"calendar","title":"State-of-the-Art Scheduling","desc":"Book, adjust, pay invoices, and review high-resolution project files instantly via our premium client portal."},{"icon":"dollar","title":"Fixed, Transparent Pricing","desc":"Enjoy absolute cost certainty. We compile comprehensive upfront estimates with line-by-line transparency."}]}$json$::jsonb),
  ('services_grid', 30, $json${"title":"Our Services","subtitle":"Professional plumbing and general contracting solutions for residential & commercial needs.","limit":6}$json$::jsonb),
  ('cta_banner', 40, $json${"title":"Have a leak, clog, or remodel in mind?","body":"Tell us what's going on and our dispatch team will get back to you fast.","buttonText":"Request Service","buttonUrl":"/request-service"}$json$::jsonb)
) as v(block_type, display_order, data)
where not exists (select 1 from public.page_blocks where page_id = 'home');

-- about
insert into public.page_blocks (page_id, block_type, display_order, is_visible, draft_data, published_data)
select 'about', v.block_type, v.display_order, true, v.data, v.data
from (values
  ('hero', 10, $json${"variant":"compact","title":"About Aquaman Plumbing & General Contracting","subtitle":"Providing high-quality plumbing and contracting services with integrity, reliability, and precision.","ctaText":"","ctaUrl":"","secondaryCtaText":"","secondaryCtaUrl":"","backgroundImage":""}$json$::jsonb),
  ('text_image', 20, $json${"title":"Our Story & Mission","body":"Founded with a commitment to premium craftsmanship, Aquaman has grown from a local plumbing team into a premier general contracting firm. We specialize in handling complex residential and commercial water systems, high-efficiency upgrades, custom bathroom & kitchen remodeling, and general maintenance.","quote":"Our mission is to safeguard our clients' homes and commercial investments by delivering robust plumbing engineering, professional project management, and completely transparent pricing on every job.","image_url":"","image_side":"right"}$json$::jsonb),
  ('features', 30, $json${"title":"Why Homeowners Trust Us","subtitle":"","items":[{"icon":"check","title":"Licensed & Insured","desc":"Licensed & insured plumbing and contracting experts."},{"icon":"calendar","title":"Digital Client Portal","desc":"Comprehensive scheduling & digital client portal tracking."},{"icon":"wrench","title":"Advanced Diagnostics","desc":"Advanced hydro-jetting, drain camera scans, and leak diagnostics."},{"icon":"clock","title":"24/7 Emergency Support","desc":"24/7 emergency support for pipe bursts, backups & failures."}]}$json$::jsonb),
  ('features', 40, $json${"title":"Licenses & Accreditations","subtitle":"","items":[{"icon":"shield","title":"Licensed Plumber","desc":"Fully compliant with California State Licensing Board regulations."},{"icon":"award","title":"General B Contractor","desc":"Qualified to execute structural alterations, plumbing upgrades & framing."},{"icon":"droplet","title":"Water Treatment Certified","desc":"Specialized in filtration systems, leak detection & pool diagnostics."}]}$json$::jsonb),
  ('team', 50, $json${"title":"Meet Our Leadership Team","subtitle":"","members":[{"name":"David \"Aquaman\" Carter","role":"Founder & Master Plumber","bio":"Over 15 years of complex water treatment & mechanical engineering experience.","photo":""},{"name":"Marcus Rodriguez","role":"Lead Contracting Estimator","bio":"Expert in structural design, kitchen remodeling, and customer logistics.","photo":""}]}$json$::jsonb)
) as v(block_type, display_order, data)
where not exists (select 1 from public.page_blocks where page_id = 'about');

-- services
insert into public.page_blocks (page_id, block_type, display_order, is_visible, draft_data, published_data)
select 'services', v.block_type, v.display_order, true, v.data, v.data
from (values
  ('hero', 10, $json${"variant":"compact","title":"Our Services","subtitle":"Professional plumbing and general contracting solutions designed for residential & commercial needs.","ctaText":"","ctaUrl":"","secondaryCtaText":"","secondaryCtaUrl":"","backgroundImage":""}$json$::jsonb),
  ('services_grid', 20, $json${"title":"","subtitle":"","limit":0}$json$::jsonb),
  ('cta_banner', 30, $json${"title":"Not sure which service you need?","body":"Describe the problem and we'll recommend the right fix.","buttonText":"Contact Us","buttonUrl":"/contact"}$json$::jsonb)
) as v(block_type, display_order, data)
where not exists (select 1 from public.page_blocks where page_id = 'services');

-- gallery
insert into public.page_blocks (page_id, block_type, display_order, is_visible, draft_data, published_data)
select 'gallery', v.block_type, v.display_order, true, v.data, v.data
from (values
  ('hero', 10, $json${"variant":"compact","title":"Project Gallery","subtitle":"Explore our professional plumbing installations, bathroom transformations, and general contracting work.","ctaText":"","ctaUrl":"","secondaryCtaText":"","secondaryCtaUrl":"","backgroundImage":""}$json$::jsonb),
  ('gallery_grid', 20, $json${"title":"","subtitle":""}$json$::jsonb)
) as v(block_type, display_order, data)
where not exists (select 1 from public.page_blocks where page_id = 'gallery');

-- contact
insert into public.page_blocks (page_id, block_type, display_order, is_visible, draft_data, published_data)
select 'contact', v.block_type, v.display_order, true, v.data, v.data
from (values
  ('hero', 10, $json${"variant":"compact","title":"Contact Us","subtitle":"Got a plumbing emergency, leak, or custom home remodel? Get in touch with our certified engineers today.","ctaText":"","ctaUrl":"","secondaryCtaText":"","secondaryCtaUrl":"","backgroundImage":""}$json$::jsonb),
  ('contact_info', 20, $json${"title":"Get in Touch","body":"Complete the quick contact form or reach out directly. We respond to all non-emergency inquiries within 2 hours."}$json$::jsonb),
  ('contact_form', 30, $json${"title":"Send us a Message","intro":"","buttonText":"Send Message","successMessage":"Message submitted successfully!"}$json$::jsonb)
) as v(block_type, display_order, data)
where not exists (select 1 from public.page_blocks where page_id = 'contact');

-- request-service
insert into public.page_blocks (page_id, block_type, display_order, is_visible, draft_data, published_data)
select 'request-service', v.block_type, v.display_order, true, v.data, v.data
from (values
  ('hero', 10, $json${"variant":"compact","title":"Book / Request a Service","subtitle":"Please fill out the form below. Once submitted, our dispatch coordinators will contact you to finalize the schedule.","ctaText":"","ctaUrl":"","secondaryCtaText":"","secondaryCtaUrl":"","backgroundImage":""}$json$::jsonb),
  ('request_form', 20, $json${"title":"","intro":"","buttonText":"Submit Service Request","successMessage":"Booking request submitted! We will contact you soon."}$json$::jsonb)
) as v(block_type, display_order, data)
where not exists (select 1 from public.page_blocks where page_id = 'request-service');

-- supabase/migrations/004_site_branding.sql
-- Brand & Theme settings for the editor (business name, logo, favicon, colors, fonts,
-- corners, footer text, page title). Run after 003_page_editor.sql.
-- Idempotent: safe to run more than once in the Supabase SQL Editor.

-- 1. Brand columns on the single global_styles row
alter table public.global_styles add column if not exists site_name text;
alter table public.global_styles add column if not exists footer_name text;
alter table public.global_styles add column if not exists footer_tagline text;
alter table public.global_styles add column if not exists copyright_text text;
alter table public.global_styles add column if not exists seo_title text;
alter table public.global_styles add column if not exists seo_description text;

-- 2. Starting values: keep anything already set, otherwise copy the existing footer
--    and company settings, otherwise use the current site's text.
insert into public.global_styles (id) values ('default') on conflict (id) do nothing;

update public.global_styles g set
  site_name       = coalesce(nullif(g.site_name, ''), 'Aquaman'),
  footer_name     = coalesce(nullif(g.footer_name, ''), nullif(f.content->>'brandName', ''), 'Aquaman Plumbing & Contracting'),
  footer_tagline  = coalesce(nullif(g.footer_tagline, ''), nullif(f.content->>'description', ''),
                      'Expert plumbing, water heater installations, drain cleaning, and general contracting remodeling.'),
  copyright_text  = coalesce(nullif(g.copyright_text, ''), '© {year} Aquaman Services Inc. All rights reserved.'),
  seo_title       = coalesce(nullif(g.seo_title, ''), nullif(c.seo_title, ''), 'Aquaman Plumbing & General Contracting'),
  seo_description = coalesce(nullif(g.seo_description, ''), nullif(c.seo_description, ''),
                      'Expert plumbing, water heater installations, drain cleaning, and general contracting remodeling.'),
  logo_url        = coalesce(nullif(g.logo_url, ''), nullif(c.logo_url, '')),
  favicon_url     = coalesce(nullif(g.favicon_url, ''), nullif(c.favicon_url, '')),
  -- The first Styles panel saved placeholder values; the editor treats these as "default"
  primary_color   = case when g.primary_color is null or lower(g.primary_color) = '#3b82f6' then '#2563eb' else g.primary_color end,
  secondary_color = case when g.secondary_color is null or lower(g.secondary_color) = '#1e293b' then '#0f172a' else g.secondary_color end,
  heading_font    = case when g.heading_font in ('Geist Sans') or g.heading_font is null then 'default' else g.heading_font end,
  body_font       = case when g.body_font in ('Geist Sans') or g.body_font is null then 'default' else g.body_font end,
  border_radius   = case when g.border_radius in ('sharp', 'small', 'default', 'round') then g.border_radius else 'default' end
from (select 1) as one
left join public.site_content f on f.id = 'footer_settings'
left join public.company_settings c on c.id = 'default'
where g.id = 'default';

-- 3. Home link in the top menu (the header shows navigation_items when the table has rows)
insert into public.navigation_items (label, url, display_order, is_active)
select 'Home', '/', 0, true
where not exists (select 1 from public.navigation_items where url = '/');

-- 4. Public bucket for photos, logos and icons uploaded in the editor (policies from 003)
insert into storage.buckets (id, name, public)
values ('public-site-images', 'public-site-images', true)
on conflict (id) do nothing;

-- 5. Visitors read the brand; only global admins change it (policies from 003)
grant select on public.global_styles to anon, authenticated;
grant all on public.global_styles to authenticated;

-- supabase/migrations/005_role_permissions.sql
-- This Supabase project does not give the anon and authenticated roles automatic
-- access to new tables or functions. Without these grants a signed-in user cannot read
-- public.profiles, so the app treats every account (global admins too) as a customer,
-- and every dashboard fails. Row level security still decides which rows each person
-- can see or change. Run after 004_site_branding.sql.
-- Idempotent: safe to run more than once in the Supabase SQL Editor.

-- 1. Grants below rely on row level security, so make sure it is on everywhere
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end;
$$;

-- 2. Signed-in users: table access, limited by each table's policies
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- 3. Helpers that the policies call
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_global_admin() to anon, authenticated;
grant execute on function public.current_user_role() to anon, authenticated;
grant execute on function public.current_customer_id() to anon, authenticated;
grant execute on function public.can_access_customer(uuid) to anon, authenticated;

-- 4. Visitors: public website content and the two public forms
grant select on public.services, public.service_categories, public.gallery_items,
  public.gallery_albums, public.page_sections, public.website_pages,
  public.website_content_blocks to anon;
grant insert on public.contact_submissions, public.service_requests to anon;

-- 5. Tables added later get the same signed-in access
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

-- supabase/migrations/006_storage_buckets.sql
-- Every storage bucket the site uploads to. public-site-images and its policies
-- come from 003 and 004. Run after 005_role_permissions.sql.
-- Idempotent: safe to run more than once in the Supabase SQL Editor.

-- 1. Website photos can be viewed by anyone; customer files and receipts stay private
insert into storage.buckets (id, name, public) values
  ('public-site-images', 'public-site-images', true),
  ('images', 'images', true),
  ('gallery-images', 'gallery-images', true),
  ('profile-images', 'profile-images', true),
  ('customer-files', 'customer-files', false),
  ('receipts', 'receipts', false)
on conflict (id) do update set public = excluded.public;

-- 2. Website photos: anyone can view, admin staff can manage
drop policy if exists "Anyone can read website photos" on storage.objects;
drop policy if exists "Admins can upload website photos" on storage.objects;
drop policy if exists "Admins can update website photos" on storage.objects;
drop policy if exists "Admins can delete website photos" on storage.objects;
create policy "Anyone can read website photos" on storage.objects for select
  using (bucket_id in ('images', 'gallery-images', 'profile-images'));
create policy "Admins can upload website photos" on storage.objects for insert
  with check (bucket_id in ('images', 'gallery-images', 'profile-images') and public.is_admin());
create policy "Admins can update website photos" on storage.objects for update
  using (bucket_id in ('images', 'gallery-images', 'profile-images') and public.is_admin())
  with check (bucket_id in ('images', 'gallery-images', 'profile-images') and public.is_admin());
create policy "Admins can delete website photos" on storage.objects for delete
  using (bucket_id in ('images', 'gallery-images', 'profile-images') and public.is_admin());

-- 3. Customer files and receipts: admin staff only
drop policy if exists "Admins can read private files" on storage.objects;
drop policy if exists "Admins can upload private files" on storage.objects;
drop policy if exists "Admins can update private files" on storage.objects;
drop policy if exists "Admins can delete private files" on storage.objects;
create policy "Admins can read private files" on storage.objects for select
  using (bucket_id in ('customer-files', 'receipts') and public.is_admin());
create policy "Admins can upload private files" on storage.objects for insert
  with check (bucket_id in ('customer-files', 'receipts') and public.is_admin());
create policy "Admins can update private files" on storage.objects for update
  using (bucket_id in ('customer-files', 'receipts') and public.is_admin())
  with check (bucket_id in ('customer-files', 'receipts') and public.is_admin());
create policy "Admins can delete private files" on storage.objects for delete
  using (bucket_id in ('customer-files', 'receipts') and public.is_admin());

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


-- ==========================================
-- 5. CARD PAYMENTS
-- ==========================================

-- Stripe can send the same event more than once. One card payment must only
-- ever create one row, or the invoice would count it twice.
create unique index if not exists payments_stripe_payment_intent_key
  on public.payments (reference_number)
  where payment_method = 'stripe' and reference_number like 'pi\_%';

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
