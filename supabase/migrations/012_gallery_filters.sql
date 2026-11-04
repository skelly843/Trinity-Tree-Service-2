-- supabase/migrations/012_gallery_filters.sql
-- Named filters for the gallery ("Tree Services", "Remodels", ...). Admins create them and
-- tag each project with one or more; visitors filter the public gallery by them.
-- Safe to run more than once.

create table if not exists public.gallery_filters (
  id uuid default gen_random_uuid() primary key,
  name text not null check (length(btrim(name)) > 0),
  sort_order integer not null default 0,
  created_at timestamp with time zone default now()
);

create unique index if not exists gallery_filters_name_key on public.gallery_filters (lower(btrim(name)));

create table if not exists public.gallery_item_filters (
  item_id uuid not null references public.gallery_items(id) on delete cascade,
  filter_id uuid not null references public.gallery_filters(id) on delete cascade,
  primary key (item_id, filter_id)
);

create index if not exists gallery_item_filters_filter_idx on public.gallery_item_filters (filter_id);

alter table public.gallery_filters enable row level security;
alter table public.gallery_item_filters enable row level security;

grant select on public.gallery_filters, public.gallery_item_filters to anon, authenticated;
grant insert, update, delete on public.gallery_filters, public.gallery_item_filters to authenticated;

drop policy if exists "Anyone reads gallery filters" on public.gallery_filters;
drop policy if exists "Admins insert gallery filters" on public.gallery_filters;
drop policy if exists "Admins update gallery filters" on public.gallery_filters;
drop policy if exists "Admins delete gallery filters" on public.gallery_filters;
create policy "Anyone reads gallery filters" on public.gallery_filters for select to anon, authenticated using (true);
create policy "Admins insert gallery filters" on public.gallery_filters for insert to authenticated with check (public.is_admin());
create policy "Admins update gallery filters" on public.gallery_filters for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete gallery filters" on public.gallery_filters for delete to authenticated using (public.is_admin());

-- A project's tags are visible to whoever can see the project itself (gallery_items rules apply in the subquery)
drop policy if exists "Visible projects' filters are readable" on public.gallery_item_filters;
drop policy if exists "Admins tag gallery items" on public.gallery_item_filters;
drop policy if exists "Admins untag gallery items" on public.gallery_item_filters;
create policy "Visible projects' filters are readable" on public.gallery_item_filters for select to anon, authenticated
  using (exists (select 1 from public.gallery_items gi where gi.id = gallery_item_filters.item_id));
create policy "Admins tag gallery items" on public.gallery_item_filters for insert to authenticated
  with check (public.is_admin() and exists (select 1 from public.gallery_items gi where gi.id = gallery_item_filters.item_id));
create policy "Admins untag gallery items" on public.gallery_item_filters for delete to authenticated
  using (public.is_admin());
