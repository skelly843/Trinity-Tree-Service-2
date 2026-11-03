import { SiteName } from '@/components/SiteTheme'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import {
  Calendar,
  Clock,
  FileText,
  MessageSquare,
  History,
  ArrowRight,
  TreeDeciduous,
  User,
  Home,
  FileCheck,
  CreditCard,
  Receipt,
  Camera,
  FolderOpen
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function CustomerDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Match customer record by email
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('email', user.email || '')
    .limit(1)
    .maybeSingle()

  const customerId = customer?.id || null

  // Fetch appointments, invoices, jobs, notes
  let appointments: any[] = []
  let invoices: any[] = []

  if (customerId) {
    const { data: apts } = await supabase
      .from('appointments')
      .select('*')
      .eq('customer_id', customerId)
      .order('scheduled_at', { ascending: false })
      .limit(3)
    appointments = apts || []

    const { data: invs } = await supabase
      .from('invoices')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(3)
    invoices = invs || []
  }

  const stats = [
    { label: 'Upcoming Jobs', value: appointments.filter(a => ['pending', 'confirmed', 'in_progress'].includes(a.status || '')).length, icon: Calendar, color: 'bg-blue-500' },
    { label: 'Total Visits', value: appointments.filter(a => a.status === 'completed').length, icon: History, color: 'bg-green-500' },
    { label: 'Unpaid Invoices', value: invoices.filter(i => i.status === 'unpaid' || i.status === 'sent').length, icon: FileText, color: 'bg-red-500' },
  ]

  const portalNav = [
    { label: 'My Profile', href: '/portal/profile', icon: User },
    { label: 'My Properties', href: '/portal/properties', icon: Home },
    { label: 'My Appointments', href: '/portal/appointments', icon: Calendar },
    { label: 'My Requests', href: '/portal/requests', icon: Clock },
    { label: 'My Jobs', href: '/portal/jobs', icon: TreeDeciduous },
    { label: 'My Estimates', href: '/portal/estimates', icon: FileCheck },
    { label: 'My Invoices', href: '/portal/invoices', icon: FileText },
    { label: 'My Payments', href: '/portal/payments', icon: CreditCard },
    { label: 'My Receipts', href: '/portal/receipts', icon: Receipt },
    { label: 'My Project Photos', href: '/portal/photos', icon: Camera },
    { label: 'My Documents', href: '/portal/documents', icon: FolderOpen },
    { label: 'Messages & Notes', href: '/portal/notes', icon: MessageSquare },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="px-6 lg:px-12 h-20 flex items-center justify-between border-b bg-white sticky top-0 z-50 shadow-sm">
        <Link href="/" className="flex items-center space-x-2">
          <TreeDeciduous className="text-blue-600" size={32} />
          <span className="text-2xl font-bold text-slate-900 tracking-tight"><SiteName suffix=" Client Portal" /></span>
        </Link>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-bold text-slate-700">Hello, {profile?.full_name || 'Client'}</span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg">
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 mt-1">Manage your plumbing & contracting jobs, properties, estimates, and billing.</p>
          </div>
          <Link
            href="/request-service"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-100 flex items-center justify-center space-x-2"
          >
            <TreeDeciduous size={20} />
            <span>Request New Service</span>
          </Link>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-xl ${stat.color} text-white`}>
                  <stat.icon size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Portal section links */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-slate-900 text-lg">My Portal Sections</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {portalNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col items-center text-center space-y-3 group"
              >
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <item.icon size={20} />
                </div>
                <span className="text-xs font-bold text-slate-700">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Appointments */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <Clock className="mr-2 text-slate-400" size={20} />
                Recent Appointments
              </h2>
              <Link href="/portal/appointments" className="text-sm font-bold text-blue-600 hover:underline">View All</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {appointments.map((apt) => (
                <div key={apt.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-4">
                     <div className={`w-2 h-12 rounded-full ${apt.status === 'completed' ? 'bg-green-400' : 'bg-blue-400'}`} />
                     <div>
                       <p className="font-bold text-slate-800">{apt.service_type}</p>
                       <p className="text-xs text-slate-500">{format(new Date(apt.scheduled_at), 'PPP p')}</p>
                     </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    apt.status === 'completed' ? 'text-green-600 bg-green-50 border-green-100' : 'text-blue-600 bg-blue-50 border-blue-100'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              ))}
              {appointments.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                  No appointment history yet.
                </div>
              )}
            </div>
          </div>

          {/* Latest Invoices */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <FileText className="mr-2 text-slate-400" size={20} />
                Recent Invoices
              </h2>
              <Link href="/portal/invoices" className="text-sm font-bold text-blue-600 hover:underline">View All</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {invoices.map((inv) => (
                <div key={inv.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-bold text-slate-800">${inv.total || inv.amount}</p>
                    <p className="text-xs text-slate-500">{inv.notes || 'Service Invoice'}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    inv.status === 'paid' ? 'text-green-600 bg-green-50 border-green-100' : 'text-red-600 bg-red-50 border-red-100'
                  }`}>
                    {inv.status}
                  </span>
                </div>
              ))}
              {invoices.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                  No invoices found.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
