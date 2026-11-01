-- supabase/migrations/010_stripe_payment_guard.sql
-- Stripe can send the same event more than once. One card payment must only
-- ever create one row, or the invoice would count it twice.

create unique index if not exists payments_stripe_payment_intent_key
  on public.payments (reference_number)
  where payment_method = 'stripe' and reference_number like 'pi\_%';
