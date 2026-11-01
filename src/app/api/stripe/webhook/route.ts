import { NextResponse } from 'next/server'
import { stripe } from '@/utils/stripe'
import { createAdminClient } from '@/utils/supabase/admin'
import { headers } from 'next/headers'

const UNIQUE_VIOLATION = '23505'

export async function POST(request: Request) {
  const body = await request.text()
  const sig = (await headers()).get('stripe-signature')!

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const invoiceId = session.metadata?.invoiceId

    if (invoiceId && session.payment_status === 'paid') {
      // Any failure below returns a 500 so Stripe sends the event again
      const supabase = createAdminClient()
      if (!supabase) {
        console.error('Stripe webhook: SUPABASE_SERVICE_ROLE_KEY is not set')
        return NextResponse.json({ error: 'Server is not configured' }, { status: 500 })
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('customer_id')
        .eq('id', invoiceId)
        .maybeSingle()

      if (invoiceError || !invoice) {
        console.error('Stripe webhook: could not load invoice', invoiceId, invoiceError)
        return NextResponse.json({ error: 'Invoice not found' }, { status: 500 })
      }

      const paymentIntentId = session.payment_intent as string

      // The sync_invoice_payments trigger updates the invoice from this row.
      // A unique index means a repeated event cannot record the payment twice.
      const { error: paymentError } = await supabase.from('payments').insert({
        customer_id: invoice.customer_id,
        invoice_id: invoiceId,
        amount: (session.amount_total ?? 0) / 100,
        payment_method: 'stripe',
        reference_number: paymentIntentId,
        status: 'confirmed',
      })

      if (paymentError && paymentError.code !== UNIQUE_VIOLATION) {
        console.error('Stripe webhook: could not record payment', invoiceId, paymentError)
        return NextResponse.json({ error: 'Could not record payment' }, { status: 500 })
      }

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentId,
        })
        .eq('id', invoiceId)

      if (updateError) {
        console.error('Stripe webhook: could not update invoice', invoiceId, updateError)
        return NextResponse.json({ error: 'Could not update invoice' }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ received: true })
}
