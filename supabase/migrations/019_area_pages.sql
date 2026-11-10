-- supabase/migrations/019_area_pages.sql
-- A short description per main city (Business Settings). A city with a description gets
-- its own page on the website (/service-areas/<city>), which helps the business show up in
-- searches like "tree service in Temple". Cities without one are only listed, so the site
-- never has near-empty copies of the same page, which search engines penalize.
-- Run after 018_arborists_and_assistant.sql. Safe to run more than once.

alter table public.company_settings add column if not exists area_pages jsonb not null default '{}'::jsonb;

alter table public.company_settings drop constraint if exists company_settings_area_pages_check;
alter table public.company_settings add constraint company_settings_area_pages_check
  check (jsonb_typeof(area_pages) = 'object' and length(area_pages::text) < 60000);
