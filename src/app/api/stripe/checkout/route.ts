import { NextResponse } from 'next/server'
import { stripe } from '@/utils/stripe'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Card payments are not available right now.' }, { status: 503 })
    }

    const { invoiceId } = await request.json()
    const supabase = await createClient()

    if (!supabase.from) {
       return NextResponse.json({ error: 'Supabase client error' }, { status: 500 })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to pay this invoice.' }, { status: 401 })
    }

    // Row level security limits this to invoices the signed-in user can access
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, customer_id, status, total, amount_paid')
      .eq('id', invoiceId)
      .single()

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (!['sent', 'partial', 'overdue'].includes(invoice.status)) {
      return NextResponse.json({ error: 'This invoice cannot take a payment.' }, { status: 400 })
    }

    const balanceCents = Math.round((Number(invoice.total) - Number(invoice.amount_paid)) * 100)
    if (balanceCents <= 0) {
      return NextResponse.json({ error: 'This invoice has no balance to pay.' }, { status: 400 })
    }

    const { data: pending } = await supabase
      .from('payments')
      .select('id')
      .eq('invoice_id', invoice.id)
      .eq('status', 'pending')
      .limit(1)

    if (pending?.length) {
      return NextResponse.json({ error: 'A payment on this invoice is already waiting for review.' }, { status: 409 })
    }

    const origin = request.headers.get('origin')

    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Invoice #INV-${invoice.invoice_number}`,
              },
              unit_amount: balanceCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${origin}/portal/invoices?success=true`,
        cancel_url: `${origin}/portal/invoices?canceled=true`,
        metadata: {
          invoiceId: invoice.id,
          customerId: invoice.customer_id,
        },
      },
      // Pressing pay twice reopens the same checkout, so the card cannot be charged twice
      { idempotencyKey: `invoice-${invoice.id}-${balanceCents}` }
    )

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Could not start the payment. Please try again.' }, { status: 500 })
  }
}
