import { createClient } from '@supabase/supabase-js'

/**
 * Bypasses row level security, so only use it on the server, for requests that
 * have already been verified and have no signed-in user (the Stripe webhook).
 * Returns null when the service role key is not configured.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) return null

  return createClient(supabaseUrl.trim().replace(/\/$/, ''), serviceRoleKey.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
