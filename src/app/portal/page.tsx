import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck,
  FileText,
  FolderOpen,
  History,
  Home,
  Camera,
  MessageSquare,
  Plus,
  Receipt,
  Briefcase,
  User,
  UserCircle,
  Wallet
} from 'lucide-react'

function money(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

/** Customer home: what needs their attention first, then the five portal sections. */
export default async function CustomerDashboard() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()

  // The customer record linked to this login (by link, or the same email)
  let customer: any = null
  if ((profile as any)?.customer_id) {
    const { data } = await supabase.from('customers').select('*').eq('id', (profile as any).customer_id).maybeSingle()
    customer = data
  }
  if (!customer && user.email) {
    const { data } = await supabase.from('customers').select('*').eq('email', user.email.toLowerCase()).limit(1).maybeSingle()
    customer = data
  }

  const nowIso = new Date().toISOString()
  const [apptRes, estRes, invRes, msgRes, docRes, doneRes, recentInvRes] = customer
    ? await Promise.all([
        supabase
          .from('appointments')
          .select('id, service_type, scheduled_at, status')
          .eq('customer_id', customer.id)
          .gte('scheduled_at', nowIso)
          .in('status', ['pending', 'confirmed', 'in_progress'])
          .order('scheduled_at', { ascending: true })
          .limit(3),
        supabase.from('estimates').select('id, status').eq('customer_id', customer.id).in('status', ['sent', 'viewed']),
        supabase
          .from('invoices')
          .select('id, total, amount_paid, status, due_date')
          .eq('customer_id', customer.id)
          .in('status', ['sent', 'partial', 'overdue']),
        supabase
          .from('notes')
          .select('id, content, author_id, created_at')
          .eq('customer_id', customer.id)
          .eq('visibility', 'customer_visible')
          .order('created_at', { ascending: false })
          .limit(1),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).eq('is_visible_to_customer', true),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).eq('status', 'completed'),
        supabase
          .from('invoices')
          .select('id, invoice_number, total, amount_paid, status, notes, issue_date')
          .eq('customer_id', customer.id)
          .neq('status', 'draft')
          .order('created_at', { ascending: false })
          .limit(3)
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { count: 0 }, { count: 0 }, { data: [] }]

  const upcoming: any[] = (apptRes as any).data || []

  // Who the customer can expect: their main arborist and whoever is on each visit
  const { data: team } = customer ? await supabase.rpc('customer_team') : { data: [] }
  const teamRows: { kind: string; ref_id: string; full_name: string | null; avatar_url: string | null }[] = (team as any) || []
  const primary = teamRows.find((t) => t.kind === 'primary')
  const visitStaff = new Map(teamRows.filter((t) => t.kind === 'visit').map((t) => [t.ref_id, t.full_name]))
  const openEstimates: any[] = (estRes as any).data || []
  const openInvoices: any[] = (invRes as any).data || []
  const lastMessage: any = ((msgRes as any).data || [])[0]
  const visitsDone: number = (doneRes as any).count || 0
  const recentInvoices: any[] = (recentInvRes as any).data || []
  const balance = openInvoices.reduce((sum, i) => sum + Math.max(Number(i.total || 0) - Number(i.amount_paid || 0), 0), 0)
  const overdue = openInvoices.some((i) => i.status === 'overdue' || (i.due_date && new Date(`${i.due_date}T23:59:59`) < new Date()))
  const officeWroteLast = lastMessage && lastMessage.author_id !== user.id

  const firstName = (profile?.full_name || customer?.first_name || '').split(' ')[0]

  const attention = [
    openEstimates.length > 0 && {
      href: '/portal/estimates',
      icon: FileCheck,
      tone: 'bg-amber-50 text-amber-700 border-amber-200',
      title: openEstimates.length === 1 ? 'An estimate is waiting for your answer' : `${openEstimates.length} estimates are waiting for your answer`,
      detail: 'Review the work and approve the items you want.'
    },
    balance > 0 && {
      href: '/portal/invoices',
      icon: FileText,
      tone: overdue ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200',
      title: `${money(balance)} ${overdue ? 'is past due' : 'is due'}`,
      detail: `${openInvoices.length} open invoice${openInvoices.length === 1 ? '' : 's'}`
    },
    officeWroteLast && {
      href: '/portal/notes',
      icon: MessageSquare,
      tone: 'bg-blue-50 text-blue-700 border-blue-200',
      title: 'New message from our office',
      detail: String(lastMessage.content).slice(0, 90) + (String(lastMessage.content).length > 90 ? '…' : '')
    }
  ].filter(Boolean) as { href: string; icon: any; tone: string; title: string; detail: string }[]

  // Computer view: every section as its own tile, like a classic dashboard
  const allSections = [
    { label: 'My Profile', href: '/portal/profile', icon: User },
    { label: 'My Properties', href: '/portal/properties', icon: Home },
    { label: 'My Appointments', href: '/portal/appointments', icon: Calendar },
    { label: 'My Requests', href: '/portal/requests', icon: Clock },
    { label: 'My Jobs', href: '/portal/jobs', icon: Briefcase },
    { label: 'My Estimates', href: '/portal/estimates', icon: FileCheck },
    { label: 'My Invoices', href: '/portal/invoices', icon: FileText },
    { label: 'My Payments', href: '/portal/payments', icon: CreditCard },
    { label: 'My Receipts', href: '/portal/receipts', icon: Receipt },
    { label: 'My Project Photos', href: '/portal/photos', icon: Camera },
    { label: 'My Documents', href: '/portal/documents', icon: FolderOpen },
    { label: 'Messages & Notes', href: '/portal/notes', icon: MessageSquare }
  ]

  // Phone view: three big choices
  const phoneSections = [
    {
      href: '/portal/profile',
      icon: UserCircle,
      label: 'My Profile',
      detail: upcoming.length
        ? `${upcoming.length} upcoming visit${upcoming.length === 1 ? '' : 's'} · properties, jobs, documents, photos`
        : 'Properties, appointments, requests, jobs, documents, project photos'
    },
    {
      href: '/portal/invoices',
      icon: Wallet,
      label: 'My Finances',
      detail: balance > 0 ? `${money(balance)} due · estimates, invoices, payments` : 'Estimates, invoices, payments, receipts'
    },
    { href: '/portal/notes', icon: MessageSquare, label: 'Messages & Notes', detail: 'Talk with our office' }
  ]

  const stats = [
    { label: 'Upcoming Visits', value: String(upcoming.length), icon: Calendar, color: 'bg-blue-600' },
    { label: 'Visits Completed', value: String(visitsDone), icon: History, color: 'bg-green-600' },
    { label: 'Balance Due', value: money(balance), icon: FileText, color: balance > 0 ? 'bg-red-500' : 'bg-slate-400' }
  ]

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{firstName ? `Hi, ${firstName}` : 'Welcome'}</h1>
          <p className="text-slate-500 mt-1">Here&apos;s what&apos;s happening with your service.</p>
        </div>
        <Link
          href="/request-service"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Request Service
        </Link>
      </div>

      {!customer && (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-900">
          Your login isn&apos;t linked to a customer account yet. Our office will connect it shortly; until then your
          appointments and invoices won&apos;t show here.
        </div>
      )}

      {primary?.full_name && (
        <section className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm" aria-label="Your arborist">
          {primary.avatar_url ? (
            <img src={primary.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
          ) : (
            <span className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 font-extrabold flex items-center justify-center shrink-0">
              {primary.full_name.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Your arborist</p>
            <p className="font-bold text-slate-900">{primary.full_name}</p>
          </div>
        </section>
      )}

      {/* What needs the customer's attention */}
      <section className="space-y-3" aria-labelledby="attention">
        <h2 id="attention" className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Needs your attention
        </h2>
        {attention.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {attention.map((item) => (
              <Link key={item.href} href={item.href} className={`flex items-center gap-4 p-4 rounded-2xl border ${item.tone} hover:shadow-sm`}>
                <item.icon size={22} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{item.title}</p>
                  <p className="text-sm opacity-80 truncate">{item.detail}</p>
                </div>
                <ArrowRight size={18} className="shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 text-slate-600">
            <CheckCircle2 size={20} className="text-green-600 shrink-0" />
            <span className="font-semibold">You&apos;re all caught up.</span>
          </div>
        )}
      </section>

      {/* Next visits */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm" aria-labelledby="upcoming">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 id="upcoming" className="font-bold text-slate-900">
            Upcoming visits
          </h2>
          <Link href="/portal/appointments" className="text-sm font-bold text-blue-600 hover:underline">
            See all
          </Link>
        </div>
        {upcoming.length ? (
          <ul className="divide-y divide-slate-100">
            {upcoming.map((apt) => (
              <li key={apt.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{apt.service_type}</p>
                  <p className="text-sm text-slate-500">
                    {format(new Date(apt.scheduled_at), 'EEE, MMM d · h:mm a')}
                    {visitStaff.get(apt.id) ? ` · with ${visitStaff.get(apt.id)}` : ''}
                  </p>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700">
                  {String(apt.status).replace('_', ' ')}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-slate-400">No visits scheduled.</p>
        )}
      </section>

      {/* Phone: three big choices */}
      <section aria-label="Portal sections" className="grid gap-3 sm:hidden">
        {phoneSections.map((sec) => (
          <Link
            key={sec.href}
            href={sec.href}
            className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm active:bg-slate-50"
          >
            <span className="p-3 rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <sec.icon size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-slate-900">{sec.label}</span>
              <span className="block text-sm text-slate-500">{sec.detail}</span>
            </span>
            <ArrowRight size={18} className="text-slate-400 shrink-0" />
          </Link>
        ))}
      </section>

      {/* Computer: the detailed dashboard */}
      <div className="hidden sm:block space-y-8">
        <section aria-label="Summary" className="grid grid-cols-3 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <span className={`p-3 rounded-xl ${stat.color} text-white`}>
                <stat.icon size={24} />
              </span>
              <span>
                <span className="block text-sm font-medium text-slate-500">{stat.label}</span>
                <span className="block text-2xl font-black text-slate-900">{stat.value}</span>
              </span>
            </div>
          ))}
        </section>

        <section aria-labelledby="all-sections" className="space-y-4">
          <h2 id="all-sections" className="font-extrabold text-slate-900 text-lg">
            My Portal Sections
          </h2>
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-4">
            {allSections.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col items-center text-center gap-3 group"
              >
                <span className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <item.icon size={20} />
                </span>
                <span className="text-xs font-bold text-slate-700">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm" aria-labelledby="recent-invoices">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 id="recent-invoices" className="font-bold text-slate-900">
              Recent invoices
            </h2>
            <Link href="/portal/invoices" className="text-sm font-bold text-blue-600 hover:underline">
              See all
            </Link>
          </div>
          {recentInvoices.length ? (
            <ul className="divide-y divide-slate-100">
              {recentInvoices.map((inv) => (
                <li key={inv.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800">
                      Invoice #{inv.invoice_number} · {money(Number(inv.total || 0))}
                    </p>
                    <p className="text-sm text-slate-500 truncate">{inv.notes || 'Service invoice'}</p>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      inv.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {inv.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-slate-400">No invoices yet.</p>
          )}
        </section>
      </div>
    </main>
  )
}
