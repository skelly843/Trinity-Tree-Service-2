-- supabase/migrations/015_service_radius.sql
-- Service area as a circle on a map (center and radius in miles) plus regions served
-- seasonally, such as storm and hurricane response in other states.
-- Shown on the Contact page and given to search engines.
-- Run after 014_customer_invites.sql. Safe to run more than once.

alter table public.company_settings add column if not exists service_radius jsonb;
alter table public.company_settings add column if not exists seasonal_areas text[] not null default array[]::text[];

-- service_radius looks like {"lat": 31.55, "lng": -97.15, "miles": 250, "label": "Waco, TX"}
alter table public.company_settings drop constraint if exists company_settings_service_radius_check;
alter table public.company_settings add constraint company_settings_service_radius_check check (
  service_radius is null or (
    jsonb_typeof(service_radius -> 'lat') = 'number'
    and jsonb_typeof(service_radius -> 'lng') = 'number'
    and jsonb_typeof(service_radius -> 'miles') = 'number'
    and (service_radius ->> 'lat')::numeric between -90 and 90
    and (service_radius ->> 'lng')::numeric between -180 and 180
    and (service_radius ->> 'miles')::numeric between 1 and 1500
  )
);
