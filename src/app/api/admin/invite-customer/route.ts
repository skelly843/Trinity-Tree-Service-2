import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getProfile } from '@/utils/supabase/getProfile'

/**
 * Emails a customer an invitation to create their portal login.
 * The customer record must already exist; staff can only invite customers they manage.
 */
export async function POST(request: Request) {
  const profile = await getProfile()
  if (!profile || !profile.is_active || !['global_admin', 'admin', 'employee'].includes(profile.role)) {
    return NextResponse.json({ error: 'Only staff can send invitations.' }, { status: 403 })
  }

  const { customerId } = await request.json().catch(() => ({}))
  if (!customerId) return NextResponse.json({ error: 'Choose a customer.' }, { status: 400 })

  // Read with the staff member's own session, so they can only invite customers they can see
  const supabase = await createClient()
  const { data: customer } = await supabase
    .from('customers')
    .select('id, first_name, last_name, email')
    .eq('id', customerId)
    .maybeSingle()
  if (!customer) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 })
  const email = (customer.email || '').trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'Add an email address to this customer first.' }, { status: 400 })

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'Invitations are not set up. Add SUPABASE_SERVICE_ROLE_KEY in Netlify (marked secret) and redeploy.' },
      { status: 503 }
    )
  }

  const origin = request.headers.get('origin') || new URL(request.url).origin
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/accept-invite`,
    data: { full_name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() }
  })

  if (error) {
    if (/already been registered|already registered|already exists/i.test(error.message)) {
      return NextResponse.json(
        { error: 'This email already has a login. If it is waiting, approve it here. If they forgot the password, they can use Forgot password on the login page.' },
        { status: 409 }
      )
    }
    if (/rate limit/i.test(error.message)) {
      return NextResponse.json({ error: 'Too many emails sent recently. Wait a few minutes and try again.' }, { status: 429 })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await supabase.from('audit_logs').insert([
    { action: 'customer_invited', actor_id: profile.id, target_id: customer.id, target_type: 'customer', details: { email } }
  ])

  return NextResponse.json({ invited: email })
}
