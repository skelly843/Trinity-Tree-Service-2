# Deployment & Administration Guide

## Supabase Configuration

Configure these environment variables in your hosting provider (e.g., Netlify).

| Variable Name | Description | Value Format |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL. | Base URL only: `https://xyz.supabase.co`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase API "anon" key. | Found in Settings > API. |

## Launching the Site for a New Company

This folder is the template. Each company gets its own copy of it, its own Supabase project and its own Netlify site. Nothing is shared between companies.

0. **Make the company's copy** from this folder in PowerShell:
   ```powershell
   .\new-company.ps1 -Name "Short Name" -CompanyName "Full Company Name" -Tagline "One line about the business" -Phone "(555) 555-5555" -Email "owner@example.com"
   ```
   It creates a folder next to this one with the name filled in. In the copy, write the company's page text in `src/components/blocks/defaultPages.json` and its sample services in `src/utils/fallbackData.ts`, put its logo and browser tab icon in `public/`, and set the logo, icon and colors at the top of `supabase/new-company-start.sql`. Push the copy to its own GitHub repository.

1. **Create a Supabase project** for the company.
2. **Set up the database** in the Supabase SQL Editor: run all of `supabase/full-setup.sql`. Then check the values at the top of the copy's `supabase/new-company-start.sql` and run it once. It clears the sample services, gallery and page text, and sets the business name, contact details, logo and colors. Never run it on a site in use.
3. **Check Authentication settings** in Supabase. Leave **Confirm email** on: customer accounts link to their records only after the email is confirmed. Set **Site URL** to the company's web address so confirmation emails link to the right site. Add custom email sending (SMTP) before going live, because Supabase's built-in email is limited to a few messages an hour.
4. **Create a Netlify site** from the company's repository and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from the company's Supabase project, Settings > API). Add the Stripe settings below if the company takes card payments. Set the production branch to the repository's default branch.
5. **Create the global admin accounts**: sign up on the new site with your account and the business owner's, then make both global admins (see below).
6. **Brand the site**: sign in, open any public page, click **Edit this page** (bottom right), then:
   - **Brand & Theme** in the toolbar: business name, logo, browser tab icon, colors, fonts, corner style, footer text and search-engine title/description. Click **Save brand & theme**.
   - Click any text on a page to change it. On the first section, use **Add background photo** or **Background color**. Use **Replace photo** on images, and drag, add, hide or delete sections. Click **Publish** on each page.
   - Phone, email, address, hours and service areas: **Admin > Settings**. Services and gallery photos: their admin pages.

When a migration is added to `supabase/migrations`, run that one file on each existing client project, and add it to `full-setup.sql`.

## Customer Accounts

New customer accounts must confirm their email, then wait for a global admin. Approve them in **Admin > Admin Accounts > Customer Logins**. To connect an account to its records, add a customer in **Admin > Customers & CRM** using the same email address.

## Card Payments With Stripe

Customers see **Pay by Card** on their invoices once these are set on the Netlify site. Without them, the site works normally and the button stays hidden.

| Variable Name | Description |
| :--- | :--- |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key. Also turns on the **Pay by Card** button. |
| `STRIPE_SECRET_KEY` | Stripe secret key. Keep it private. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret from the webhook below. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (Settings > API). Keep it private, and never give it a `NEXT_PUBLIC_` name. |

In Stripe, add a webhook pointing to `https://<site address>/api/stripe/webhook` that sends the `checkout.session.completed` event, and copy its signing secret. The webhook is what marks an invoice as paid, so a card payment will not show on the invoice until it is set up. Redeploy the site after adding these. Test with Stripe's test keys before going live.

On an existing project, run `supabase/migrations/010_stripe_payment_guard.sql` first.

## Payments Without a Payment Processor

Customers click **I Sent a Payment** on an invoice to report a check, cash or bank transfer. Nothing is charged. Staff click **Confirm** or **Reject** in **Admin > Payments**, and only confirmed payments change the invoice.

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

To apply the necessary table structures, triggers, and RLS policies, run `supabase/full-setup.sql` in the **Supabase SQL Editor**.

**Key Security Features:**
- **Strict Defaults:** The `handle_new_user` trigger ignores any role passed from the frontend and always defaults to `customer`.
- **RLS Protection:** Customers are logically isolated. They cannot query or modify data belonging to other users.
- **Middleware Guard:** Server-side redirection prevents customers from even seeing the admin UI.
