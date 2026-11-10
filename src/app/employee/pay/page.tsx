'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Clock, Loader2, Wallet } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { money } from '@/utils/finance'
import { methodLabel, payTotals, showDate, type Earning, type Payout } from '@/utils/workerPay'

/** A worker's own pay: what's owed, what's coming, and every payment, which they confirm. */
export default function EmployeePayPage() {
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) return
    const [e, p] = await Promise.all([
      supabase.from('worker_earnings').select('*, jobs(title, job_number)').eq('worker_id', user.id).neq('status', 'void').order('work_date', { ascending: false }),
      supabase.from('worker_payouts').select('*').eq('worker_id', user.id).order('paid_on', { ascending: false })
    ])
    setEarnings((e.data as Earning[]) || [])
    setPayouts((p.data as Payout[]) || [])
    setError(e.error?.message || p.error?.message || null)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function confirmReceived(id: string) {
    setConfirming(id)
    const { error: rpcError } = await createClient().rpc('confirm_worker_payout', { p_payout: id })
    setConfirming(null)
    if (rpcError) setError(rpcError.message)
    else load()
  }

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    )
  }

  const totals = payTotals(earnings, payouts)
  const unconfirmed = payouts.filter((p) => !p.voided_at && !p.worker_confirmed_at)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">My Pay</h1>
        <p className="text-slate-500 mt-1">What you&apos;ve earned and every payment sent to you.</p>
      </div>

      {error && <p className="p-3 rounded-xl bg-red-50 text-sm font-semibold text-red-700">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Owed to you now</p>
          <p className="text-2xl font-extrabold text-green-700 mt-1">{money(totals.owedTotal)}</p>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">When current jobs finish</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{money(totals.upcomingTotal)}</p>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Paid to you in {new Date().getFullYear()}</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{money(totals.paidThisYearTotal)}</p>
        </div>
      </div>

      {unconfirmed.length > 0 && (
        <section className="p-4 rounded-2xl border border-amber-200 bg-amber-50 space-y-3">
          <p className="font-bold text-amber-900">Please confirm these payments arrived</p>
          {unconfirmed.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl p-3 border border-amber-100">
              <span className="text-sm text-slate-700">
                <strong>{money(Number(p.amount))}</strong> by {methodLabel(p.method)} on {showDate(p.paid_on)}
                {p.reference ? ` (#${p.reference})` : ''}
              </span>
              <button
                type="button"
                onClick={() => confirmReceived(p.id)}
                disabled={confirming === p.id}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-bold disabled:opacity-50"
              >
                {confirming === p.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} I received this
              </button>
            </div>
          ))}
          <p className="text-xs text-amber-800">If a payment didn&apos;t arrive or the amount is wrong, tell the office instead of confirming.</p>
        </section>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="px-5 py-4 border-b border-slate-100 font-bold text-slate-900 flex items-center gap-2">
          <Wallet size={18} /> Payments
        </h2>
        {payouts.length ? (
          <ul className="divide-y divide-slate-100">
            {payouts.map((p) => (
              <li key={p.id} className={`px-5 py-3 flex items-center justify-between gap-3 ${p.voided_at ? 'opacity-60' : ''}`}>
                <div className="min-w-0">
                  <p className={`font-bold text-slate-900 ${p.voided_at ? 'line-through' : ''}`}>{money(Number(p.amount))}</p>
                  <p className="text-sm text-slate-500">
                    {methodLabel(p.method)} · {showDate(p.paid_on)}
                    {p.reference ? ` · #${p.reference}` : ''}
                  </p>
                  {p.voided_at && <p className="text-xs text-red-600">Cancelled by the office: {p.void_reason}</p>}
                </div>
                {!p.voided_at && (
                  <span className={`shrink-0 text-xs font-bold ${p.worker_confirmed_at ? 'text-green-700' : 'text-amber-700'}`}>
                    {p.worker_confirmed_at ? 'Received' : 'Not confirmed'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-slate-400">No payments yet.</p>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="px-5 py-4 border-b border-slate-100 font-bold text-slate-900 flex items-center gap-2">
          <Clock size={18} /> Earnings
        </h2>
        {earnings.length ? (
          <ul className="divide-y divide-slate-100">
            {earnings.map((e) => (
              <li key={e.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{e.description}</p>
                  <p className="text-sm text-slate-500">
                    {showDate(e.work_date)}
                    {e.jobs?.job_number ? ` · Job #${e.jobs.job_number}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-slate-900">{money(Number(e.amount))}</p>
                  <p className="text-xs font-bold text-slate-500">{e.payout_id ? 'Paid' : e.status === 'approved' ? 'Owed' : 'Job not finished'}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-slate-400">No earnings recorded yet.</p>
        )}
      </section>
    </div>
  )
}
