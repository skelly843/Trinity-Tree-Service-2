-- supabase/migrations/013_income_and_imports.sql
-- Income that is not a customer invoice payment (bank deposits, cash sales, refunds,
-- grants), so the financial report can show everything that came in, and so statement
-- lines read by the AI import have somewhere to go.
-- Run after 012_gallery_filters.sql. Safe to run more than once.

create table if not exists public.income_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  source text not null,
  description text,
  amount numeric not null check (amount > 0),
  category text not null default 'Other income',
  file_ref text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamp with time zone not null default now()
);

create index if not exists income_entries_date_idx on public.income_entries (entry_date);
create index if not exists expenses_date_idx on public.expenses (expense_date);

alter table public.income_entries enable row level security;

drop policy if exists "Global admins select income" on public.income_entries;
drop policy if exists "Global admins insert income" on public.income_entries;
drop policy if exists "Global admins update income" on public.income_entries;
drop policy if exists "Global admins delete income" on public.income_entries;
create policy "Global admins select income" on public.income_entries for select to authenticated using (public.is_global_admin());
create policy "Global admins insert income" on public.income_entries for insert to authenticated with check (public.is_global_admin());
create policy "Global admins update income" on public.income_entries for update to authenticated using (public.is_global_admin()) with check (public.is_global_admin());
create policy "Global admins delete income" on public.income_entries for delete to authenticated using (public.is_global_admin());

revoke all on public.income_entries from anon;
grant select, insert, update, delete on public.income_entries to authenticated;
