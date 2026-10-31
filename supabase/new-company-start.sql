-- supabase/new-company-start.sql
-- Run once on a brand-new client project, after full-setup.sql.
-- Change the values in the first block below, then run the whole file.
-- It clears the sample business content so the site starts clean for that client.
-- Do not run this on a site that is already in use.

do $$
declare
  v_short_name text := 'New Business';
  v_company_name text := 'New Business LLC';
  v_phone text := '';
  v_email text := '';
  v_address text := '';
begin
  -- Sample services, gallery projects and service categories
  delete from public.gallery_items;
  delete from public.gallery_albums;
  delete from public.services;
  delete from public.service_categories;
  delete from public.page_sections;

  -- Business details
  update public.company_settings
  set company_name = v_company_name,
      phone = v_phone,
      email = v_email,
      address = v_address,
      emergency_service_notice = null,
      service_areas = array[]::text[],
      seo_title = v_company_name,
      seo_description = null;

  update public.global_styles
  set site_name = v_short_name,
      footer_name = v_company_name,
      footer_tagline = '',
      copyright_text = '© {year} ' || v_company_name || '. All rights reserved.',
      seo_title = v_company_name,
      seo_description = '';

  -- Sample business name in page text. The rest of the page text is edited in the site editor.
  update public.page_blocks
  set draft_data = replace(replace(replace(draft_data::text,
        'Aquaman Plumbing & General Contracting', v_company_name),
        'Aquaman Contracting', v_short_name),
        'Aquaman', v_short_name)::jsonb,
      published_data = replace(replace(replace(published_data::text,
        'Aquaman Plumbing & General Contracting', v_company_name),
        'Aquaman Contracting', v_short_name),
        'Aquaman', v_short_name)::jsonb;
end;
$$;
