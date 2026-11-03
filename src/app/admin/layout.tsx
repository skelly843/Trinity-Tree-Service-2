import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Inbox,
  Briefcase,
  FileCheck,
  FileText,
  CreditCard,
  Receipt,
  TrendingDown,
  MessageSquare,
  Wrench,
  Image as ImageIcon,
  Monitor,
  UserCheck,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronRight,
  TreeDeciduous
} from 'lucide-react'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'customer'

  // Restrict anyone who is not an admin, global_admin, or employee
  if (role !== 'admin' && role !== 'global_admin' && role !== 'employee') {
    return redirect('/portal')
  }

  const navItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Calendar & Scheduling', href: '/admin/calendar', icon: Calendar },
    { label: 'Service Requests', href: '/admin/service-requests', icon: Inbox },
    { label: 'Customers & CRM', href: '/admin/customers', icon: Users },
    { label: 'Jobs & Projects', href: '/admin/jobs', icon: Briefcase },
    { label: 'Estimates', href: '/admin/estimates', icon: FileCheck },
    { label: 'Invoices', href: '/admin/invoices', icon: FileText },
    { label: 'Payments', href: '/admin/payments', icon: CreditCard },
    { label: 'Receipts', href: '/admin/receipts', icon: Receipt },
    { label: 'Expenses', href: '/admin/expenses', icon: TrendingDown },
    { label: 'Notes', href: '/admin/notes', icon: MessageSquare },
    { label: 'Services Manager', href: '/admin/services', icon: Wrench },
    { label: 'Gallery Manager', href: '/admin/gallery', icon: ImageIcon },
  ]

  // Only global_admin can access Admin User Accounts and Audit logs
  if (role === 'global_admin') {
    navItems.push(
      { label: 'Website Editor', href: '/admin/website-builder', icon: Monitor },
      { label: 'Admin Accounts', href: '/admin/users', icon: UserCheck },
      { label: 'Audit Log', href: '/admin/audit', icon: ShieldCheck }
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col sticky top-0 h-screen overflow-y-auto shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center space-x-2">
          <TreeDeciduous className="text-blue-500" size={24} />
          <span className="text-lg font-bold tracking-tight">CRM Admin Portal</span>
        </div>

        {/* User Badge */}
        <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-800 flex flex-col">
          <span className="font-bold text-sm truncate">{profile?.full_name || 'Staff User'}</span>
          <span className="text-xs text-blue-400 font-bold uppercase mt-0.5">{role.replace('_', ' ')}</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors group text-sm font-medium"
            >
              <item.icon size={18} className="text-slate-400 group-hover:text-blue-400 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Link href="/" className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-slate-800 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <ChevronRight size={16} className="text-slate-500 rotate-180" />
            <span>Public Site</span>
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center space-x-3 px-3 py-2 w-full rounded-md hover:bg-red-950/40 text-red-400 transition-colors text-xs font-bold uppercase tracking-wider"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
