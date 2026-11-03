import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Server-side client with no session, for data every visitor may read (page sections, brand).
 * It never touches cookies, so the public pages it feeds can be cached and served statically.
 * Returns null when Supabase is not configured.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createSupabaseClient(url.trim().replace(/\/$/, ''), key.trim(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  })
}
