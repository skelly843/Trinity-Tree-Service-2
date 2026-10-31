# Deployment & Administration Guide

## Supabase Configuration

Configure these environment variables in your hosting provider (e.g., Netlify).

| Variable Name | Description | Value Format |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL. | Base URL only: `https://xyz.supabase.co`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase API "anon" key. | Found in Settings > API. |

## Launching the Site for a New Company

Each company gets its own Supabase project and its own Netlify site, both built from this repository. Nothing is shared between companies.

1. **Create a Supabase project** for the company.
2. **Run the migrations** in the Supabase SQL Editor, in order: `supabase/migrations/001_initial_schema.sql`, `002_website_builder.sql`, `003_page_editor.sql`, `004_site_branding.sql`, `005_role_permissions.sql`, `006_storage_buckets.sql`, `007_security_hardening.sql`. Leave **Confirm email** on under Authentication: customer accounts link to their records only after the email is confirmed. The migrations start the site with the sample Aquaman text, which the company replaces in the editor.
3. **Create a Netlify site** from this repository and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from the company's Supabase project, Settings > API). Add the Stripe keys if the company takes payments.
4. **Create the company's editor account**: sign up on the new site, then make that account a global admin (see below).
5. **Brand the site**: sign in, open any public page, click **Edit this page** (bottom right), then:
   - **Brand & Theme** in the toolbar: business name, logo, browser tab icon, colors, fonts, corner style, footer text and search-engine title/description. Click **Save brand & theme**.
   - Click any text on a page to change it, use **Replace photo** on images, and drag, add, hide or delete sections. Click **Publish** on each page.
   - Phone, email, address, hours and service areas: **Admin > Settings**. Services and gallery photos: their admin pages.

## First-Time Admin Promotion

By default, **every** new user who signs up is assigned the `customer` role for security. To create the first admin account:

1. Go to your public website and **Sign Up** for a new account.
2. In the **Supabase SQL Editor**, run (with that account's email):
   ```sql
   update public.profiles set role = 'global_admin', is_active = true where email = 'owner@example.com';
   ```
3. Sign out and back in on the website.

`global_admin` is the only role that can edit the public website (the **Edit this page** button). `admin` and `employee` can use the `/admin` dashboard but cannot edit pages or branding.

## Promoting Employees

Once you are an admin, you can promote other users to `admin` or `employee` roles directly from the application:

1. Log in as an admin.
2. Navigate to **Customers & Users** (or `/admin/customers`).
3. Click **Manage** on the user you wish to promote.
4. In the **Manage Permissions** sidebar, select the new role and click **Update Role**.

## Database Setup

To apply the necessary table structures, triggers, and RLS policies, run the content of `schema.sql` in the **Supabase SQL Editor**.

**Key Security Features:**
- **Strict Defaults:** The `handle_new_user` trigger ignores any role passed from the frontend and always defaults to `customer`.
- **RLS Protection:** Customers are logically isolated. They cannot query or modify data belonging to other users.
- **Middleware Guard:** Server-side redirection prevents customers from even seeing the admin UI.
