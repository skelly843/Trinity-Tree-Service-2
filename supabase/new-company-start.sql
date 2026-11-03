-- supabase/new-company-start.sql
-- Run once on a brand-new client project, after full-setup.sql.
-- Change the values in the first block below, then run the whole file.
-- (new-company.ps1 fills these in for you when it makes the company's copy.)
-- It clears the sample business content so the site starts clean for that client.
-- Do not run this on a site that is already in use.

do $$
declare
  v_short_name text := 'Trinity Enterprise';
  v_company_name text := 'Trinity Enterprise Tree Services';
  v_tagline text := 'For all your tree service needs.';
  v_phone text := '(254) 338-8140';
  v_email text := 'jessienichols01@gmail.com';
  v_address text := '';
  v_logo_url text := '/logo.png';
  v_favicon_url text := '/favicon.png';
  v_primary_color text := '#4d7c0f';
  v_secondary_color text := '#292524';
begin
  -- Sample services, gallery projects and service categories
  delete from public.gallery_items;
  delete from public.gallery_albums;
  delete from public.services;
  delete from public.service_categories;
  delete from public.page_sections;

  -- Sample page text. With no rows, each page shows the text in
  -- src/components/blocks/defaultPages.json until it is published from the site editor.
  delete from public.page_blocks;

  -- Business details
  update public.company_settings
  set company_name = v_company_name,
      phone = v_phone,
      email = v_email,
      address = v_address,
      emergency_service_notice = null,
      service_areas = array[]::text[],
      seo_title = v_company_name,
      seo_description = nullif(v_tagline, '');

  update public.global_styles
  set site_name = v_short_name,
      footer_name = v_company_name,
      footer_tagline = v_tagline,
      copyright_text = '© {year} ' || v_short_name || '. All rights reserved.',
      seo_title = v_company_name,
      seo_description = v_tagline,
      logo_url = nullif(v_logo_url, ''),
      favicon_url = nullif(v_favicon_url, ''),
      primary_color = v_primary_color,
      secondary_color = v_secondary_color;
end;
$$;
