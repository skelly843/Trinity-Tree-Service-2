import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

/** Clears the cached public pages after the site editor saves page sections or the brand. */
export async function POST() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'global_admin' || profile?.is_active !== true) {
    return new Response('Forbidden', { status: 403 })
  }

  revalidatePath('/', 'layout')
  return Response.json({ revalidated: true })
}
