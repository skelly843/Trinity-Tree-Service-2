import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Validates the Supabase URL to ensure it is the base project URL only.
 * Throws a critical error if it contains /rest/v1, /auth/v1, or any other path.
 */
function validateSupabaseUrl(url: string | undefined) {
  if (!url) return

  const trimmedUrl = url.trim().replace(/\/$/, '')

  if (trimmedUrl.includes('/rest/v1') || trimmedUrl.includes('/auth/v1') || trimmedUrl.includes('/auth/v2')) {
    const errorMsg = `CRITICAL CONFIG ERROR: NEXT_PUBLIC_SUPABASE_URL must be the base project URL ONLY (e.g. https://xyz.supabase.co). It currently includes a path component: "${trimmedUrl}". Please remove "/rest/v1", "/auth/v1", etc. from your environment variables.`
    console.error(errorMsg)
    throw new Error(errorMsg)
  }

  try {
    const parsed = new URL(trimmedUrl)
    if (parsed.pathname !== '/' && parsed.pathname !== '') {
      const errorMsg = `CRITICAL CONFIG ERROR: NEXT_PUBLIC_SUPABASE_URL must be the base URL with no path. Detected path: "${parsed.pathname}". Current value: "${trimmedUrl}". Please update it to the base URL only.`
      console.error(errorMsg)
      throw new Error(errorMsg)
    }
  } catch (e: any) {
    if (e.message.includes('CRITICAL CONFIG ERROR')) throw e
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Run the guard
  validateSupabaseUrl(supabaseUrl)

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl.trim().replace(/\/$/, ''),
    supabaseAnonKey.trim(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Role-based route protection
  const url = request.nextUrl.clone()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'customer'

    // Block customers from admin/employee areas. Employees may only write estimates
    // (the database limits them to the customers assigned to them).
    const employeeEstimates = role === 'employee' && url.pathname.startsWith('/admin/estimates')
    if (url.pathname.startsWith('/admin') && role !== 'admin' && role !== 'global_admin' && !employeeEstimates) {
      if (url.pathname !== '/admin/login') {
        url.pathname = role === 'employee' ? '/employee' : '/portal'
        return NextResponse.redirect(url)
      }
    }

    if (url.pathname.startsWith('/employee') && role === 'customer') {
      url.pathname = '/portal'
      return NextResponse.redirect(url)
    }

    // Redirect logged in users away from login/signup
    if (url.pathname === '/login' || url.pathname === '/signup' || url.pathname === '/admin/login') {
        if (role === 'admin' || role === 'global_admin') url.pathname = '/admin'
        else if (role === 'employee') url.pathname = '/employee'
        else url.pathname = '/portal'
        return NextResponse.redirect(url)
    }
  } else {
    // If not logged in and trying to access protected areas
    if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/portal') || url.pathname.startsWith('/employee') || url.pathname.startsWith('/dashboard')) {
       if (url.pathname !== '/admin/login') {
         url.pathname = '/login'
         return NextResponse.redirect(url)
       }
    }
  }

  return supabaseResponse
}
