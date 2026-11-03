# TrinityEnterprise Business Management Portal

A secure service management platform built with Next.js, Supabase, and Stripe.

## Netlify Deployment Instructions

When deploying to Netlify, you must configure the following environment variables in the Netlify Dashboard (**Site settings > Environment variables**):

### Required for Supabase (Auth & Database)
*   **`NEXT_PUBLIC_SUPABASE_URL`**: Your Supabase project URL (found in Project Settings > API).
*   **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Your Supabase "anon public" API key.

### Required for Stripe (Payments)
*   **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`**: Your Stripe publishable key.
*   **`STRIPE_SECRET_KEY`**: Your Stripe secret key (keep this private).
*   **`STRIPE_WEBHOOK_SECRET`**: Your Stripe webhook signing secret.
*   **`SUPABASE_SERVICE_ROLE_KEY`**: Your Supabase service role key (keep this private). The webhook uses it to record card payments.

---

## Local Development

1.  Copy `.env.local.example` to `.env.local`.
2.  Fill in your Supabase and Stripe credentials.
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Run the development server:
    ```bash
    npm run dev
    ```

## Supabase Setup

Run the SQL commands provided in `schema.sql` within your Supabase SQL Editor to initialize the database tables and security policies.
