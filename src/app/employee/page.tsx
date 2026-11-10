import Link from 'next/link'
import { format, isToday, isTomorrow } from 'date-fns'
import { ArrowRight, Briefcase, CalendarDays, MapPin, Phone, Wallet } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { JobStatusButtons } from '@/components/employee/JobStatusButtons'
import { money } from '@/utils/finance'
import { payTotals, type Earning, type Payout } from '@/utils/workerPay'

const OPEN_JOB = ['approved', 'scheduled', 'in_progress', 'waiting_on_parts', 'waiting_on_customer', 'inspection_scheduled']

function dayLabel(d: Date) {
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'EEE, MMM d')
}

/** An employee's day: their visits, their open jobs, and what they're owed. */
export default async function EmployeeToday() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('full_name').eq('id', user!.id).maybeSingle()

  const now = new Date()
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  // The database only returns visits and jobs for this worker's customers or assignments
  const [visitsRes, jobsRes, earningsRes, payoutsRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, scheduled_at, service_type, status, notes, customers(first_name, last_name, phone), customer_properties(address_line, city)')
      .gte('scheduled_at', startOfToday.toISOString())
      .lte('scheduled_at', weekAhead.toISOString())
      .not('status', 'in', '(completed,cancelled,no_show)')
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('jobs')
      .select('id, job_number, title, status, start_date, customers(first_name, last_name, phone), customer_properties(address_line, city)')
      .in('status', OPEN_JOB)
      .order('start_date', { ascending: true, nullsFirst: false }),
    supabase.from('worker_earnings').select('*').eq('worker_id', user!.id).neq('status', 'void'),
    supabase.from('worker_payouts').select('*').eq('worker_id', user!.id)
  ])

  const visits: any[] = visitsRes.data || []
  const jobs: any[] = jobsRes.data || []
  const totals = payTotals((earningsRes.data as Earning[]) || [], (payoutsRes.data as Payout[]) || [])
  const firstName = (me?.full_name || '').split(' ')[0]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{firstName ? `Hi, ${firstName}` : 'Today'}</h1>
        <p className="text-slate-500 mt-1">{format(now, 'EEEE, MMMM d')}</p>
      </div>

      <Link href="/employee/pay" className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300">
        <span className="p-2.5 rounded-xl bg-green-50 text-green-700">
          <Wallet size={22} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-slate-900">{money(totals.owedTotal)} owed to you</span>
          <span className="block text-sm text-slate-500">
            {totals.upcomingTotal > 0 ? `${money(totals.upcomingTotal)} more when current jobs are finished` : 'See your pay and payments'}
          </span>
        </span>
        <ArrowRight size={18} className="text-slate-400" />
      </Link>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <CalendarDays size={16} /> Visits this week
        </h2>
        {visits.length ? (
          <ul className="space-y-3">
            {visits.map((v) => {
              const when = new Date(v.scheduled_at)
              const name = v.customers ? `${v.customers.first_name} ${v.customers.last_name}` : 'Customer'
              const address = v.customer_properties ? [v.customer_properties.address_line, v.customer_properties.city].filter(Boolean).join(', ') : ''
              return (
                <li key={v.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-blue-700">
                        {dayLabel(when)} · {format(when, 'h:mm a')}
                      </p>
                      <p className="font-bold text-slate-900">{v.service_type}</p>
                      <p className="text-sm text-slate-600">{name}</p>
                    </div>
                    <span className="shrink-0 px-2 py-1 rounded-full text-[11px] font-bold uppercase bg-slate-100 text-slate-600">
                      {String(v.status).replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {address && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-sm font-semibold text-slate-700"
                      >
                        <MapPin size={15} /> {address}
                      </a>
                    )}
                    {v.customers?.phone && (
                      <a href={`tel:${v.customers.phone}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">
                        <Phone size={15} /> Call
                      </a>
                    )}
                  </div>
                  {v.notes && <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-2.5">{v.notes}</p>}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">No visits in the next 7 days.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Briefcase size={16} /> Open jobs
        </h2>
        {jobs.length ? (
          <ul className="space-y-3">
            {jobs.map((j) => {
              const address = j.customer_properties ? [j.customer_properties.address_line, j.customer_properties.city].filter(Boolean).join(', ') : ''
              return (
                <li key={j.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">
                        #{j.job_number} {j.title}
                      </p>
                      <p className="text-sm text-slate-600">
                        {j.customers ? `${j.customers.first_name} ${j.customers.last_name}` : ''}
                        {address ? ` · ${address}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 px-2 py-1 rounded-full text-[11px] font-bold uppercase bg-blue-50 text-blue-700">
                      {String(j.status).replace(/_/g, ' ')}
                    </span>
                  </div>
                  <JobStatusButtons jobId={j.id} status={j.status} />
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">No open jobs assigned to you.</p>
        )}
      </section>
    </div>
  )
}
