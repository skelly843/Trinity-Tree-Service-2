import { Clock } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import PortalNav from '@/components/portal/PortalNav'

/** Customer accounts stay on this screen until a global admin approves them. */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('is_active').eq('id', user.id).maybeSingle()

    if (profile?.is_active === false) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
          <div className="p-10 bg-white shadow-xl rounded-2xl w-full max-w-md text-center border border-slate-200 space-y-4">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <Clock size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Waiting for approval</h1>
            <p className="text-slate-600 leading-relaxed">
              Your account has been created. You will be able to use the customer portal once our office approves it.
            </p>
            <form action="/auth/signout" method="post">
              <button type="submit" className="font-bold text-blue-600 hover:text-blue-700">
                Sign out
              </button>
            </form>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalNav />
      {children}
    </div>
  )
}
