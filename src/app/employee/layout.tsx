import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import EmployeeNav from '@/components/employee/EmployeeNav'

/** The employee area: staff only, with its own menu. */
export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, is_active').eq('id', user.id).maybeSingle()
  if (!profile || !['employee', 'admin', 'global_admin'].includes(profile.role || '')) redirect('/portal')

  return (
    <div className="min-h-screen bg-slate-50">
      <EmployeeNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  )
}
