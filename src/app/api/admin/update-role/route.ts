import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

const ASSIGNABLE_ROLES = ['customer', 'employee', 'admin']

export async function POST(request: Request) {
  const formData = await request.formData()
  const userId = String(formData.get('userId') || '')
  const role = String(formData.get('role') || '')

  // 303 so the browser follows with a normal page load instead of re-sending the form
  const back = (params: Record<string, string>) =>
    NextResponse.redirect(
      new URL(`/admin/customers/${encodeURIComponent(userId)}?${new URLSearchParams(params)}`, request.url),
      303
    )

  if (!userId || !ASSIGNABLE_ROLES.includes(role)) {
    return back({ error: 'Choose Customer, Employee or Admin.' })
  }

  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/admin/login', request.url), 303)

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (me?.role !== 'global_admin') {
    return back({ error: 'Only the site owner (global admin) can change roles.' })
  }

  const { data: target } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (!target) return back({ error: 'That account no longer exists.' })
  if (target.role === 'global_admin') {
    return back({ error: "The site owner's role can't be changed here." })
  }

  const { data: updated, error } = await supabase.from('profiles').update({ role }).eq('id', userId).select('id')
  if (error || !updated?.length) {
    console.error('Error updating role:', error)
    return back({ error: 'The role was not changed. Please try again.' })
  }

  revalidatePath(`/admin/customers/${userId}`)
  revalidatePath('/admin/customers')
  return back({ success: 'true' })
}
