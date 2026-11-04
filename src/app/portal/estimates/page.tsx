'use client'

import { SiteName } from '@/components/SiteTheme'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { TreeDeciduous, ArrowLeft, Loader2, FileCheck, CheckCircle2, AlertCircle, Check, X } from 'lucide-react'

const money = (n: number | string | null | undefined) => `$${Number(n || 0).toFixed(2)}`

export default function CustomerEstimatesPage() {
  const supabase = createClient()
  const [estimates, setEstimates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Item ids the customer has ticked, per estimate. Every item starts ticked.
  const [selected, setSelected] = useState<Record<string, string[]>>({})

  const loadEstimates = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email || '')
        .limit(1)
        .maybeSingle()

      if (customer) {
        const { data } = await supabase
          .from('estimates')
          .select('*, estimate_items(*)')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
        const rows = (data || []).map((est: any) => ({
          ...est,
          estimate_items: [...(est.estimate_items || [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
        }))
        setEstimates(rows)
        setSelected(Object.fromEntries(rows.map((est: any) => [est.id, est.estimate_items.map((it: any) => it.id)])))
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadEstimates()
  }, [])

  const toggleItem = (estimateId: string, itemId: string) =>
    setSelected((prev) => {
      const current = prev[estimateId] || []
      return {
        ...prev,
        [estimateId]: current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]
      }
    })

  /** Approves the ticked items and declines the rest. */
  const handleRespondItems = async (est: any, itemIds: string[]) => {
    setUpdating(est.id)
    setError(null)
    setSuccess(null)

    const { data: status, error: rpcErr } = await supabase.rpc('customer_respond_to_estimate_items', {
      p_estimate_id: est.id,
      p_approved_item_ids: itemIds
    })

    if (rpcErr) {
      setError(rpcErr.message)
    } else {
      setSuccess(
        status === 'declined'
          ? 'Estimate declined. Thank you for letting us know.'
          : status === 'partially_approved'
          ? 'Thank you. We will contact you to schedule the items you approved.'
          : 'Estimate approved. We will contact you to schedule the work.'
      )
      loadEstimates()
    }
    setUpdating(null)
  }

  const handleRespond = async (id: string, decision: 'approved' | 'declined') => {
    setUpdating(id)
    setError(null)
    setSuccess(null)

    const { error: updErr } = await supabase.rpc('customer_respond_to_estimate', {
      p_estimate_id: id,
      p_decision: decision
    })

    if (updErr) {
      setError(updErr.message)
    } else {
      setSuccess(decision === 'approved'
        ? 'Estimate approved. We will contact you to schedule the work.'
        : 'Estimate declined. Thank you for letting us know.')
      loadEstimates()
    }
    setUpdating(null)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 lg:px-12 h-20 flex items-center justify-between border-b bg-white sticky top-0 z-50">
        <Link href="/" className="flex items-center space-x-2">
          <TreeDeciduous className="text-blue-600" size={32} />
          <span className="text-2xl font-bold text-slate-900"><SiteName suffix=" Client Portal" /></span>
        </Link>
        <Link href="/portal" className="text-sm font-bold text-blue-600 hover:underline">
          Portal Dashboard
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 w-full space-y-6">
        <Link href="/portal" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-slate-800">
          <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
        </Link>

        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Proposals & Estimates</h1>
          <p className="text-slate-500 mt-1">Review each proposal. Tick the items you want done, then approve them. Anything you leave unticked is declined.</p>
        </div>

        {success && (
          <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-sm font-semibold text-green-700 flex items-center">
            <CheckCircle2 size={16} className="mr-2" /> {success}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm font-semibold text-red-700 flex items-center">
            <AlertCircle size={16} className="mr-2" /> {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 flex justify-center items-center bg-white rounded-2xl border border-slate-200">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">Estimates Pipeline</span>
              <span className="text-xs font-semibold text-slate-500">{estimates.length} Proposals Total</span>
            </div>

            <div className="divide-y divide-slate-100 p-6 space-y-4">
              {estimates.map((est) => {
                const open = est.status === 'sent' || est.status === 'viewed'
                const hasItems = est.estimate_items.length > 0
                const ticked = selected[est.id] || []
                const tickedTotal = est.estimate_items
                  .filter((it: any) => ticked.includes(it.id))
                  .reduce((sum: number, it: any) => sum + Number(it.total_price || 0), 0)
                return (
                  <div key={est.id} className="py-5 space-y-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start space-x-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                          <FileCheck size={22} />
                        </div>
                        <div className="space-y-1">
                          <p className="font-extrabold text-slate-800 text-lg">Proposal Estimate #{est.estimate_number}</p>
                          <p className="text-xs text-slate-500">Created: {new Date(est.created_at).toLocaleDateString()}</p>
                          {!hasItems && (
                            <div className="text-xs text-slate-500 space-y-0.5 pt-1">
                              <p>Labor Cost: {money(est.labor_cost)}</p>
                              <p>Materials Cost: {money(est.materials_cost)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Est</p>
                        <p className="text-lg font-black text-slate-900">{money(est.total)}</p>
                        {!open && (
                          <span className={`inline-block mt-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                            est.status === 'approved' || est.status === 'converted'
                              ? 'bg-green-50 text-green-700 border-green-100'
                              : est.status === 'partially_approved'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {est.status.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {hasItems && (
                      <fieldset className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                        <legend className="sr-only">Items on proposal {est.estimate_number}</legend>
                        {est.estimate_items.map((it: any) => (
                          <label
                            key={it.id}
                            className={`flex items-center gap-3 px-4 py-3 ${open ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                          >
                            {open ? (
                              <input
                                type="checkbox"
                                checked={ticked.includes(it.id)}
                                onChange={() => toggleItem(est.id, it.id)}
                                disabled={updating === est.id}
                                className="h-5 w-5 rounded border-slate-300 accent-green-600 shrink-0"
                              />
                            ) : it.customer_decision === 'approved' ? (
                              <Check size={18} className="text-green-600 shrink-0" aria-label="Approved" />
                            ) : (
                              <X size={18} className="text-slate-400 shrink-0" aria-label="Declined" />
                            )}
                            <span className={`flex-1 text-sm ${!open && it.customer_decision !== 'approved' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              {it.description}
                              {Number(it.quantity) !== 1 && (
                                <span className="text-xs text-slate-500"> ({Number(it.quantity)} x {money(it.unit_price)})</span>
                              )}
                            </span>
                            <span className="text-sm font-bold text-slate-800">{money(it.total_price)}</span>
                          </label>
                        ))}
                      </fieldset>
                    )}

                    {est.terms_conditions && (
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        Terms: {est.terms_conditions}
                      </p>
                    )}

                    {open && hasItems && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-sm text-slate-600">
                          Selected: <span className="font-black text-slate-900">{money(tickedTotal)}</span>
                          <span className="text-slate-500"> ({ticked.length} of {est.estimate_items.length} items)</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRespondItems(est, [])}
                            disabled={updating === est.id}
                            className="border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs px-4 py-2.5 rounded-xl disabled:opacity-50"
                          >
                            Decline all
                          </button>
                          <button
                            onClick={() => handleRespondItems(est, ticked)}
                            disabled={updating === est.id || ticked.length === 0}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50"
                          >
                            {updating === est.id
                              ? 'Saving...'
                              : ticked.length === est.estimate_items.length
                              ? 'Approve all'
                              : `Approve ${ticked.length} selected`}
                          </button>
                        </div>
                      </div>
                    )}

                    {open && !hasItems && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRespond(est.id, 'declined')}
                          disabled={updating === est.id}
                          className="border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs px-4 py-2.5 rounded-xl disabled:opacity-50"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleRespond(est.id, 'approved')}
                          disabled={updating === est.id}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50"
                        >
                          {updating === est.id ? 'Saving...' : 'Approve'}
                        </button>
                      </div>
                    )}

                    {est.status === 'partially_approved' && (
                      <p className="text-sm text-slate-600">
                        You approved <span className="font-black text-slate-900">{money(est.approved_total)}</span> of this proposal.
                      </p>
                    )}
                  </div>
                )
              })}
              {estimates.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic">
                  No active estimates drafted. If you requested a quote, our designers will post a proposal shortly.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
