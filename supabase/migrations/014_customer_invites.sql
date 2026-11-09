-- supabase/migrations/014_customer_invites.sql
-- Login status for each customer record, so staff can see who has been invited, who has
-- accepted and is waiting for approval, and who is active. Login details live in
-- auth.users, which the website cannot read directly; this function returns only the
-- dates and flags staff need, for customers they are allowed to manage.
-- Run after 013_income_and_imports.sql. Safe to run more than once.

create or replace function public.customer_login_statuses()
returns table (
  customer_id uuid,
  profile_id uuid,
  invited_at timestamp with time zone,
  accepted_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  is_active boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.id, u.id, u.invited_at, u.email_confirmed_at, u.last_sign_in_at, coalesce(p.is_active, false)
  from public.customers c
  join auth.users u on lower(u.email) = lower(c.email)
  left join public.profiles p on p.id = u.id
  where public.can_manage_customer(c.id);
$$;

revoke all on function public.customer_login_statuses() from public, anon;
grant execute on function public.customer_login_statuses() to authenticated;
