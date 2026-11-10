import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  FileCheck,
  FileText,
  FolderOpen,
  MessageSquare,
  Plus,
  Receipt,
  UserCircle
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
  const [apptRes, estRes, invRes, msgRes, docRes] = customer
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
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id).eq('is_visible_to_customer', true)
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { count: 0 }]

  const upcoming: any[] = (apptRes as any).data || []

  // Who the customer can expect: their main arborist and whoever is on each visit
  const { data: team } = customer ? await supabase.rpc('customer_team') : { data: [] }
  const teamRows: { kind: string; ref_id: string; full_name: string | null; avatar_url: string | null }[] = (team as any) || []
  const primary = teamRows.find((t) => t.kind === 'primary')
  const visitStaff = new Map(teamRows.filter((t) => t.kind === 'visit').map((t) => [t.ref_id, t.full_name]))
  const openEstimates: any[] = (estRes as any).data || []
  const openInvoices: any[] = (invRes as any).data || []
  const lastMessage: any = ((msgRes as any).data || [])[0]
  const docCount: number = (docRes as any).count || 0
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

  const sections = [
    {
      href: '/portal/appointments',
      icon: CalendarCheck,
      label: 'Services',
      detail: upcoming.length ? `${upcoming.length} upcoming visit${upcoming.length === 1 ? '' : 's'}` : 'Appointments, jobs and requests'
    },
    {
      href: '/portal/invoices',
      icon: Receipt,
      label: 'Billing',
      detail: balance > 0 ? `${money(balance)} due` : 'Estimates, invoices and payments'
    },
    { href: '/portal/documents', icon: FolderOpen, label: 'Files', detail: docCount ? `${docCount} shared file${docCount === 1 ? '' : 's'}` : 'Documents and photos' },
    { href: '/portal/notes', icon: MessageSquare, label: 'Messages', detail: 'Talk with our office' },
    { href: '/portal/profile', icon: UserCircle, label: 'Account', detail: 'Your details and properties' }
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

      {/* The five sections */}
      <section aria-label="Portal sections" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex lg:flex-col items-center lg:items-start gap-4 lg:gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
          >
            <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <s.icon size={20} />
            </span>
            <span className="min-w-0">
              <span className="block font-bold text-slate-900">{s.label}</span>
              <span className="block text-sm text-slate-500">{s.detail}</span>
            </span>
          </Link>
        ))}
      </section>
    </main>
  )
}
