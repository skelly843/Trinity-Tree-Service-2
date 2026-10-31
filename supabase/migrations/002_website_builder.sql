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
