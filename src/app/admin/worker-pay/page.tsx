'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Ban, CheckCircle2, Download, Loader2, Plus, Send, Wallet } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { money } from '@/utils/finance'
import {
  PAY_METHODS,
  methodLabel,
  payTotals,
  referenceRequired,
  showDate,
  sumAmounts,
  type Earning,
  type Payout
} from '@/utils/workerPay'

interface Worker {
  id: string
  full_name: string | null
  email: string | null
  role: string
}

const today = () => new Date().toLocaleDateString('en-CA')
const workerName = (w?: Worker) => w?.full_name || w?.email || 'Worker'
const EMPTY_EARNING = { jobId: '', description: '', amount: '', owedNow: true, workDate: '' }

/**
 * The owner records what each worker earns and every payout sent by Zelle, Cash App,
 * check or cash. Payout amounts are the total of the earnings being paid, recorded payouts
 * can't be edited or deleted (only voided with a reason), and workers confirm receipt.
 */
export default function WorkerPayPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [workerId, setWorkerId] = useState('')
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [earningForm, setEarningForm] = useState(EMPTY_EARNING)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [payForm, setPayForm] = useState({ method: 'zelle', reference: '', paidOn: today(), note: '' })
  const [exportYear, setExportYear] = useState(new Date().getFullYear())

  const load = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()
    const { data: me } = await supabase.from('profiles').select('role').eq('id', user?.id || '').maybeSingle()
    if (me?.role !== 'global_admin') {
      setIsOwner(false)
      setLoading(false)
      return
    }
    const [w, e, p, j] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, role').in('role', ['employee', 'admin']).order('full_name'),
      supabase.from('worker_earnings').select('*, jobs(title, job_number)').order('work_date', { ascending: false }),
      supabase.from('worker_payouts').select('*').order('paid_on', { ascending: false }),
      supabase.from('jobs').select('id, job_number, title, status').neq('status', 'cancelled').order('created_at', { ascending: false }).limit(300)
    ])
    setWorkers((w.data as Worker[]) || [])
    setEarnings((e.data as Earning[]) || [])
    setPayouts((p.data as Payout[]) || [])
    setJobs(j.data || [])
    setError(w.error?.message || e.error?.message || p.error?.message || null)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const worker = workers.find((w) => w.id === workerId)
  const workerEarnings = useMemo(() => earnings.filter((e) => e.worker_id === workerId && e.status !== 'void'), [earnings, workerId])
  const workerPayouts = useMemo(() => payouts.filter((p) => p.worker_id === workerId), [payouts, workerId])
  const totals = payTotals(workerEarnings, workerPayouts)
  const selectedRows = totals.owed.filter((e) => selected.has(e.id))
  const payTotal = sumAmounts(selectedRows)
  const method = PAY_METHODS.find((m) => m.value === payForm.method)!

  // Everything owed is ticked by default whenever the worker or their earnings change
  useEffect(() => {
    setSelected(new Set(earnings.filter((e) => e.worker_id === workerId && e.status === 'approved' && !e.payout_id).map((e) => e.id)))
  }, [earnings, workerId])

  function flash(message: string) {
    setNotice(message)
    setError(null)
    setTimeout(() => setNotice(null), 6000)
  }

  async function addEarning(e: React.FormEvent) {
    e.preventDefault()
    const amount = Number(earningForm.amount)
    if (!workerId || !(amount > 0) || !earningForm.description.trim()) {
      setError('Choose a worker and enter a description and an amount above $0.')
      return
    }
    setBusy(true)
    const { error: insertError } = await createClient()
      .from('worker_earnings')
      .insert([
        {
          worker_id: workerId,
          job_id: earningForm.jobId || null,
          description: earningForm.description.trim(),
          amount: Math.round(amount * 100) / 100,
          status: earningForm.owedNow ? 'approved' : 'pending',
          work_date: earningForm.workDate || today()
        }
      ])
    setBusy(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setEarningForm(EMPTY_EARNING)
    flash('Earning added.')
    load()
  }

  async function setEarningStatus(id: string, status: 'approved' | 'void') {
    if (status === 'void' && !confirm('Remove this earning? It stays in the records as void.')) return
    const { error: updateError } = await createClient().from('worker_earnings').update({ status }).eq('id', id)
    if (updateError) setError(updateError.message)
    else load()
  }

  async function recordPayout() {
    if (!selectedRows.length) {
      setError('Tick at least one earning to pay.')
      return
    }
    if (referenceRequired(payForm.method) && !payForm.reference.trim()) {
      setError(`Enter the ${method.reference.toLowerCase()} so this payment can be matched to your bank or app records.`)
      return
    }
    const summary = `Record ${money(payTotal)} paid to ${workerName(worker)} by ${method.label} on ${showDate(payForm.paidOn)}${
      payForm.reference.trim() ? ` (#${payForm.reference.trim()})` : ''
    }?\n\nOnly record it after the money has been sent. Recorded payments can't be edited, only voided.`
    if (!confirm(summary)) return
    setBusy(true)
    const { error: rpcError } = await createClient().rpc('record_worker_payout', {
      p_worker: workerId,
      p_earning_ids: selectedRows.map((r) => r.id),
      p_method: payForm.method,
      p_reference: payForm.reference.trim(),
      p_paid_on: payForm.paidOn,
      p_note: payForm.note.trim()
    })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setPayForm({ method: payForm.method, reference: '', paidOn: today(), note: '' })
    flash(`Payment of ${money(payTotal)} recorded. ${workerName(worker)} will be asked to confirm it arrived.`)
    load()
  }

  async function voidPayout(p: Payout) {
    const reason = prompt(`Why is the ${money(Number(p.amount))} payment being voided? (for example: sent to the wrong person, recorded twice)`)
    if (!reason?.trim()) return
    const { error: rpcError } = await createClient().rpc('void_worker_payout', { p_payout: p.id, p_reason: reason.trim() })
    if (rpcError) setError(rpcError.message)
    else {
      flash('Payment voided. Its earnings are owed again.')
      load()
    }
  }

  function exportYearCsv() {
    const rows = payouts.filter((p) => !p.voided_at && p.paid_on.startsWith(String(exportYear)))
    const byWorker = new Map<string, Payout[]>()
    rows.forEach((p) => byWorker.set(p.worker_id, [...(byWorker.get(p.worker_id) || []), p]))
    const quote = (v: string) => `"${String(v).replace(/"/g, '""')}"`
    const lines = [['Worker', 'Email', 'Date paid', 'Method', 'Reference', 'Amount', 'Confirmed by worker'].map(quote).join(',')]
    byWorker.forEach((list, id) => {
      const w = workers.find((x) => x.id === id)
      list
        .sort((a, b) => a.paid_on.localeCompare(b.paid_on))
        .forEach((p) =>
          lines.push(
            [workerName(w), w?.email || '', p.paid_on, methodLabel(p.method), p.reference || '', Number(p.amount).toFixed(2), p.worker_confirmed_at ? 'Yes' : 'No']
              .map(quote)
              .join(',')
          )
        )
      lines.push([`${workerName(w)} total for ${exportYear}`, '', '', '', '', sumAmounts(list).toFixed(2), ''].map(quote).join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `worker-payments-${exportYear}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    )
  }

  if (!isOwner) {
    return <p className="p-8 text-slate-600">Only the owner account can see and record worker pay.</p>
  }

  const years = Array.from(new Set([new Date().getFullYear(), ...payouts.map((p) => Number(p.paid_on.slice(0, 4)))])).sort((a, b) => b - a)
  const input = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Worker Pay</h1>
          <p className="text-slate-500 mt-1">Record what each worker earns and every payment you send them.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={exportYear} onChange={(e) => setExportYear(Number(e.target.value))} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
          <button type="button" onClick={exportYearCsv} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold">
            <Download size={16} /> Year totals (CSV)
          </button>
        </div>
      </div>

      {error && (
        <p className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm font-semibold text-red-700 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </p>
      )}
      {notice && (
        <p className="p-3 rounded-xl bg-green-50 border border-green-100 text-sm font-semibold text-green-700 flex items-center gap-2">
          <CheckCircle2 size={16} /> {notice}
        </p>
      )}

      {/* Workers */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {workers.map((w) => {
          const t = payTotals(
            earnings.filter((e) => e.worker_id === w.id && e.status !== 'void'),
            payouts.filter((p) => p.worker_id === w.id)
          )
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => setWorkerId(w.id)}
              className={`text-left p-4 rounded-2xl border shadow-sm transition-all ${
                w.id === workerId ? 'bg-blue-50 border-blue-400' : 'bg-white border-slate-200 hover:border-blue-300'
              }`}
            >
              <p className="font-bold text-slate-900">{workerName(w)}</p>
              <p className="text-sm text-slate-500 capitalize">{w.role}</p>
              <p className="mt-2 text-sm">
                <span className="font-bold text-green-700">{money(t.owedTotal)} owed</span>
                <span className="text-slate-500"> · {money(t.upcomingTotal)} upcoming</span>
              </p>
            </button>
          )
        })}
        {!workers.length && (
          <p className="p-6 bg-white rounded-2xl border border-slate-200 text-slate-500 sm:col-span-2 lg:col-span-3">
            No workers yet. Give someone the Employee role in Customers &amp; CRM (Update Role) and they&apos;ll appear here.
          </p>
        )}
      </section>

      {worker && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pay now */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Send size={18} /> Pay {workerName(worker)}
            </h2>
            {totals.owed.length ? (
              <>
                <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
                  {totals.owed.map((e) => (
                    <li key={e.id}>
                      <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected.has(e.id)}
                          onChange={(ev) => {
                            const next = new Set(selected)
                            if (ev.target.checked) next.add(e.id)
                            else next.delete(e.id)
                            setSelected(next)
                          }}
                        />
                        <span className="flex-1 min-w-0 text-sm">
                          <span className="block font-semibold text-slate-800 truncate">{e.description}</span>
                          <span className="text-slate-500">{showDate(e.work_date)}</span>
                        </span>
                        <span className="text-sm font-bold">{money(Number(e.amount))}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700 space-y-1">
                    <span>Paid by</span>
                    <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} className={input}>
                      {PAY_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-slate-700 space-y-1">
                    <span>Date sent</span>
                    <input type="date" value={payForm.paidOn} max={today()} onChange={(e) => setPayForm({ ...payForm, paidOn: e.target.value })} className={input} />
                  </label>
                  <label className="text-sm font-semibold text-slate-700 space-y-1 sm:col-span-2">
                    <span>{method.reference}</span>
                    <input
                      value={payForm.reference}
                      onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                      className={input}
                      placeholder={referenceRequired(payForm.method) ? 'Required, copy it from the app or check' : ''}
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-700 space-y-1 sm:col-span-2">
                    <span>Note (optional)</span>
                    <input value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} className={input} />
                  </label>
                </div>
                <ol className="text-sm text-slate-600 list-decimal pl-5 space-y-1">
                  <li>
                    Send <strong>{money(payTotal)}</strong> to {workerName(worker)} in {method.label}.
                  </li>
                  <li>Copy the {method.reference.toLowerCase()} into the box above.</li>
                  <li>Record it here.</li>
                </ol>
                <button
                  type="button"
                  onClick={recordPayout}
                  disabled={busy || !selectedRows.length}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white font-bold disabled:opacity-50"
                >
                  {busy ? <Loader2 size={18} className="animate-spin" /> : <Wallet size={18} />} Record {money(payTotal)} payment
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-500">Nothing is owed right now. Earnings become owed when you mark them so, or when their job is completed.</p>
            )}
          </section>

          {/* Add earning */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Plus size={18} /> Add earning for {workerName(worker)}
            </h2>
            <form onSubmit={addEarning} className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700 space-y-1 sm:col-span-2">
                <span>Job (optional)</span>
                <select
                  value={earningForm.jobId}
                  onChange={(e) => {
                    const job = jobs.find((j) => j.id === e.target.value)
                    setEarningForm({
                      ...earningForm,
                      jobId: e.target.value,
                      description: earningForm.description || (job ? job.title : ''),
                      owedNow: job ? job.status === 'completed' : earningForm.owedNow
                    })
                  }}
                  className={input}
                >
                  <option value="">No job</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      #{j.job_number} {j.title} ({String(j.status).replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1 sm:col-span-2">
                <span>Description</span>
                <input value={earningForm.description} onChange={(e) => setEarningForm({ ...earningForm, description: e.target.value })} className={input} placeholder="Oak removal, 2 days labor" />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Amount ($)</span>
                <input type="number" min="0.01" step="0.01" inputMode="decimal" value={earningForm.amount} onChange={(e) => setEarningForm({ ...earningForm, amount: e.target.value })} className={input} />
              </label>
              <label className="text-sm font-semibold text-slate-700 space-y-1">
                <span>Work date</span>
                <input type="date" value={earningForm.workDate || today()} onChange={(e) => setEarningForm({ ...earningForm, workDate: e.target.value })} className={input} />
              </label>
              <fieldset className="sm:col-span-2 text-sm text-slate-700 space-y-1">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={earningForm.owedNow} onChange={() => setEarningForm({ ...earningForm, owedNow: true })} /> Work is done, owed now
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={!earningForm.owedNow} onChange={() => setEarningForm({ ...earningForm, owedNow: false })} /> Job not finished yet
                  {earningForm.jobId ? ' (becomes owed when the job is marked completed)' : ''}
                </label>
              </fieldset>
              <button type="submit" disabled={busy} className="sm:col-span-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50">
                Add earning
              </button>
            </form>

            {totals.upcoming.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-700">Waiting on the job to finish</p>
                <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
                  {totals.upcoming.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="flex-1 min-w-0 truncate">{e.description}</span>
                      <span className="font-bold">{money(Number(e.amount))}</span>
                      <button type="button" onClick={() => setEarningStatus(e.id, 'approved')} className="text-xs font-bold text-blue-600">
                        Owed now
                      </button>
                      <button type="button" onClick={() => setEarningStatus(e.id, 'void')} className="text-xs font-bold text-red-600">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {totals.owed.length > 0 && (
              <p className="text-xs text-slate-500">
                To fix an owed earning that hasn&apos;t been paid,{' '}
                {totals.owed.map((e, i) => (
                  <span key={e.id}>
                    {i > 0 && ', '}
                    <button type="button" onClick={() => setEarningStatus(e.id, 'void')} className="font-bold text-red-600">
                      remove “{e.description}”
                    </button>
                  </span>
                ))}{' '}
                and add it again.
              </p>
            )}
          </section>

          {/* History */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
            <h2 className="px-5 py-4 border-b border-slate-100 font-bold text-slate-900">
              Payments to {workerName(worker)} · {money(totals.paidThisYearTotal)} this year
            </h2>
            {workerPayouts.length ? (
              <ul className="divide-y divide-slate-100">
                {workerPayouts.map((p) => (
                  <li key={p.id} className={`px-5 py-3 flex flex-wrap items-center justify-between gap-3 ${p.voided_at ? 'opacity-60' : ''}`}>
                    <div className="min-w-0">
                      <p className={`font-bold text-slate-900 ${p.voided_at ? 'line-through' : ''}`}>{money(Number(p.amount))}</p>
                      <p className="text-sm text-slate-500">
                        {methodLabel(p.method)} · {showDate(p.paid_on)}
                        {p.reference ? ` · #${p.reference}` : ''}
                        {p.note ? ` · ${p.note}` : ''}
                      </p>
                      {p.voided_at && <p className="text-xs text-red-600">Voided: {p.void_reason}</p>}
                    </div>
                    {!p.voided_at && (
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold ${p.worker_confirmed_at ? 'text-green-700' : 'text-amber-700'}`}>
                          {p.worker_confirmed_at ? `Confirmed ${new Date(p.worker_confirmed_at).toLocaleDateString()}` : 'Not confirmed yet'}
                        </span>
                        <button type="button" onClick={() => voidPayout(p)} className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
                          <Ban size={14} /> Void
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-slate-400">No payments recorded yet.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
