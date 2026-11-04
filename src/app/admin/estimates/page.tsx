'use client'

import { Fragment, useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FileCheck, Plus, CheckCircle2, AlertCircle, Loader2, ArrowRight, Trash2, ChevronDown, ChevronRight, Send, Pencil, X, Check } from 'lucide-react'

type LineItem = { description: string; quantity: string; unitPrice: string }

const blankItem = (): LineItem => ({ description: '', quantity: '1', unitPrice: '' })
const money = (n: number | string | null | undefined) => `$${Number(n || 0).toFixed(2)}`
const lineTotal = (item: LineItem) => Math.round(Number(item.quantity || 0) * Number(item.unitPrice || 0) * 100) / 100

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-50 text-slate-500 border-slate-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-100',
  viewed: 'bg-blue-50 text-blue-700 border-blue-100',
  approved: 'bg-green-50 text-green-700 border-green-100',
  partially_approved: 'bg-amber-50 text-amber-700 border-amber-100',
  declined: 'bg-red-50 text-red-700 border-red-100',
  converted: 'bg-purple-50 text-purple-700 border-purple-100'
}

export default function AdminEstimatesPage() {
  const supabase = createClient()
  const [estimates, setEstimates] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ customerId: '', terms: '' })
  const [items, setItems] = useState<LineItem[]>([blankItem()])

  const formTotal = items.reduce((sum, item) => sum + lineTotal(item), 0)

  const loadEstimates = async () => {
    setLoading(true)
    const { data: ests } = await supabase
      .from('estimates')
      .select('*, customers(first_name, last_name, email), estimate_items(*)')
      .order('created_at', { ascending: false })

    const { data: custs } = await supabase
      .from('customers')
      .select('id, first_name, last_name')
      .order('last_name', { ascending: true })

    setEstimates(
      (ests || []).map((est: any) => ({
        ...est,
        estimate_items: [...(est.estimate_items || [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
      }))
    )
    setCustomers(custs || [])
    setLoading(false)
  }

  useEffect(() => {
    loadEstimates()
  }, [])

  const handleOpenNew = () => {
    setEditingId(null)
    setFormData({ customerId: '', terms: '' })
    setItems([blankItem()])
    setShowModal(true)
  }

  const handleOpenEdit = (est: any) => {
    setEditingId(est.id)
    setFormData({ customerId: est.customer_id, terms: est.terms_conditions || '' })
    setItems(
      est.estimate_items.length > 0
        ? est.estimate_items.map((it: any) => ({
            description: it.description,
            quantity: String(it.quantity),
            unitPrice: String(it.unit_price)
          }))
        : [blankItem()]
    )
    setShowModal(true)
  }

  const updateItem = (index: number, patch: Partial<LineItem>) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  /** Saves the estimate and its lines. `send` makes it visible to the customer. */
  const saveEstimate = async (send: boolean) => {
    const lines = items.filter((item) => item.description.trim())
    if (!formData.customerId) return setError('Choose a customer.')
    if (lines.length === 0) return setError('Add at least one line item.')
    if (lines.some((item) => !(Number(item.quantity) > 0) || Number(item.unitPrice) < 0 || item.unitPrice === '')) {
      return setError('Each line needs a quantity above 0 and a price.')
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    const total = lines.reduce((sum, item) => sum + lineTotal(item), 0)
    const fields = {
      customer_id: formData.customerId,
      labor_cost: 0,
      materials_cost: 0,
      subtotal: total,
      total,
      approved_total: 0,
      status: send ? 'sent' : 'draft',
      terms_conditions: formData.terms
    }

    try {
      let estimateId = editingId
      if (editingId) {
        const { error: updErr } = await supabase.from('estimates').update(fields).eq('id', editingId)
        if (updErr) throw updErr
        const { error: delErr } = await supabase.from('estimate_items').delete().eq('estimate_id', editingId)
        if (delErr) throw delErr
      } else {
        const { data, error: insErr } = await supabase.from('estimates').insert([fields]).select('id').single()
        if (insErr) throw insErr
        estimateId = data.id
      }

      const { error: itemsErr } = await supabase.from('estimate_items').insert(
        lines.map((item, i) => ({
          estimate_id: estimateId,
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unit_price: Number(item.unitPrice),
          total_price: lineTotal(item),
          sort_order: i + 1
        }))
      )
      if (itemsErr) throw itemsErr

      setSuccess(send ? 'Estimate sent. The customer can now approve the items they want.' : 'Estimate draft saved.')
      setShowModal(false)
      loadEstimates()
    } catch (err: any) {
      setError(err.message)
    }
    setSaving(false)
  }

  const handleSend = async (est: any) => {
    setError(null)
    setSuccess(null)
    const { error: updErr } = await supabase.from('estimates').update({ status: 'sent' }).eq('id', est.id)
    if (updErr) {
      setError(updErr.message)
    } else {
      setSuccess(`Estimate #${est.estimate_number} sent to the customer.`)
      loadEstimates()
    }
  }

  const handleConvertToJob = async (est: any) => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    // Only the lines the customer approved become part of the job
    const approvedLines = est.estimate_items.filter((it: any) => it.customer_decision === 'approved')
    const scope = approvedLines.length > 0
      ? approvedLines.map((it: any) => `- ${it.description} (${it.quantity} x ${money(it.unit_price)} = ${money(it.total_price)})`).join('\n')
      : ''
    const amount = Number(est.approved_total) > 0 ? est.approved_total : est.total

    const { data: newJob, error: jobErr } = await supabase
      .from('jobs')
      .insert([
        {
          customer_id: est.customer_id,
          title: `Project: Converted Estimate #${est.estimate_number}`,
          description: [scope && `Approved work:\n${scope}`, est.terms_conditions && `Terms: ${est.terms_conditions}`]
            .filter(Boolean)
            .join('\n\n'),
          total_amount: amount,
          status: 'approved',
          payment_status: 'unpaid'
        }
      ])
      .select()
      .single()

    if (jobErr) {
      setError(jobErr.message)
    } else {
      await supabase
        .from('estimates')
        .update({ status: 'converted', job_id: newJob.id })
        .eq('id', est.id)

      setSuccess(`Converted Estimate #${est.estimate_number} into a job for ${money(amount)}.`)
      loadEstimates()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this estimate?')) return
    const { error: delErr } = await supabase
      .from('estimates')
      .delete()
      .eq('id', id)

    if (delErr) {
      setError(delErr.message)
    } else {
      setSuccess('Estimate removed.')
      loadEstimates()
    }
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Contract Estimating & Proposals</h1>
          <p className="text-slate-500 mt-1">List each item of work and its price. Customers approve the items they want, and approved work converts to a job.</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center space-x-1.5 shadow-md shadow-blue-100"
        >
          <Plus size={16} />
          <span>New Proposal Estimate</span>
        </button>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-sm font-semibold text-green-700 flex items-center">
          <CheckCircle2 size={16} className="mr-2" /> {success}
        </div>
      )}

      {error && !showModal && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm font-semibold text-red-700 flex items-center">
          <AlertCircle size={16} className="mr-2" /> {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 flex justify-center items-center">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800">Proposal Estimates</span>
            <span className="text-xs font-semibold text-slate-500">{estimates.length} Proposals Total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Proposal ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total / Approved</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {estimates.map((est) => {
                  const isOpen = expanded === est.id
                  const approvedCount = est.estimate_items.filter((it: any) => it.customer_decision === 'approved').length
                  return (
                    <Fragment key={est.id}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono font-bold text-slate-700">
                          <button
                            type="button"
                            onClick={() => setExpanded(isOpen ? null : est.id)}
                            className="flex items-center gap-1 hover:text-blue-600"
                            aria-expanded={isOpen}
                          >
                            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            EST-{est.estimate_number}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-semibold">
                          {est.customers?.first_name} {est.customers?.last_name}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${STATUS_STYLES[est.status] || STATUS_STYLES.draft}`}>
                            {est.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {est.estimate_items.length} item{est.estimate_items.length === 1 ? '' : 's'}
                          {['approved', 'partially_approved', 'converted'].includes(est.status) && est.estimate_items.length > 0 && (
                            <p className="text-green-700 font-semibold">{approvedCount} approved</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <p className="font-black text-slate-900">{money(est.total)}</p>
                          {['approved', 'partially_approved', 'converted'].includes(est.status) && (
                            <p className="text-xs font-bold text-green-700">{money(est.approved_total)} approved</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {est.status === 'draft' && (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(est)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                                  aria-label={`Edit estimate ${est.estimate_number}`}
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  onClick={() => handleSend(est)}
                                  disabled={est.estimate_items.length === 0}
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center space-x-1 disabled:opacity-40"
                                >
                                  <Send size={12} />
                                  <span>Send</span>
                                </button>
                              </>
                            )}
                            {(est.status === 'approved' || est.status === 'partially_approved') && (
                              <button
                                onClick={() => handleConvertToJob(est)}
                                disabled={saving}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center space-x-1 disabled:opacity-50"
                              >
                                <ArrowRight size={12} />
                                <span>{est.status === 'partially_approved' ? 'Convert approved items' : 'Convert to Job'}</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(est.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                              aria-label={`Delete estimate ${est.estimate_number}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={6} className="px-6 py-4">
                            {est.estimate_items.length === 0 ? (
                              <p className="text-sm text-slate-400 italic">
                                No line items. Older estimates were saved as a single total of {money(est.total)}.
                              </p>
                            ) : (
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                                    <th className="text-left font-bold pb-2">Item</th>
                                    <th className="text-right font-bold pb-2">Qty</th>
                                    <th className="text-right font-bold pb-2">Price</th>
                                    <th className="text-right font-bold pb-2">Line total</th>
                                    <th className="text-right font-bold pb-2">Customer</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {est.estimate_items.map((it: any) => (
                                    <tr key={it.id}>
                                      <td className="py-2 text-slate-700">{it.description}</td>
                                      <td className="py-2 text-right text-slate-500">{Number(it.quantity)}</td>
                                      <td className="py-2 text-right text-slate-500">{money(it.unit_price)}</td>
                                      <td className="py-2 text-right font-semibold text-slate-800">{money(it.total_price)}</td>
                                      <td className="py-2 text-right">
                                        {it.customer_decision === 'approved' ? (
                                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700"><Check size={12} /> Approved</span>
                                        ) : it.customer_decision === 'declined' ? (
                                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600"><X size={12} /> Declined</span>
                                        ) : (
                                          <span className="text-xs text-slate-400">Waiting</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                            {est.terms_conditions && (
                              <p className="text-xs text-slate-500 mt-3">Terms: {est.terms_conditions}</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
                {estimates.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                      No proposal estimates found. Click "New Proposal Estimate" to compose a bid.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Estimate form */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-6">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Proposal Estimate' : 'Compose Proposal Estimate'}</h2>
              <p className="text-xs text-slate-400 mt-1">List each item of work separately. The customer approves or declines each line.</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                saveEstimate(false)
              }}
              className="p-6 space-y-5"
            >
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm font-semibold text-red-700 flex items-center">
                  <AlertCircle size={16} className="mr-2 shrink-0" /> {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="estimate-customer" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Customer</label>
                <select
                  id="estimate-customer"
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  required
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <span className="col-span-6">Item / service</span>
                  <span className="col-span-2">Qty</span>
                  <span className="col-span-2">Unit price ($)</span>
                  <span className="col-span-2 text-right">Line total</span>
                </div>
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                      className="col-span-6 px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="e.g. Remove dead oak by the driveway"
                      aria-label={`Item ${i + 1} description`}
                    />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, { quantity: e.target.value })}
                      className="col-span-2 px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      aria-label={`Item ${i + 1} quantity`}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(i, { unitPrice: e.target.value })}
                      className="col-span-2 px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="0.00"
                      aria-label={`Item ${i + 1} unit price`}
                    />
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <span className="text-sm font-semibold text-slate-800">{money(lineTotal(item))}</span>
                      <button
                        type="button"
                        onClick={() => setItems((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : [blankItem()]))}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        aria-label={`Remove item ${i + 1}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setItems((prev) => [...prev, blankItem()])}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus size={14} /> Add item
                  </button>
                  <p className="text-sm font-black text-slate-900">Total: {money(formTotal)}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="estimate-terms" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Terms & Scope</label>
                <textarea
                  id="estimate-terms"
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-20"
                  placeholder="Payment upon completion, valid for 30 days..."
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setError(null)
                  }}
                  className="px-5 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all text-xs"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all text-xs disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    type="button"
                    onClick={() => saveEstimate(true)}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold transition-all shadow-md text-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send size={12} /> {saving ? 'Saving...' : 'Send to Customer'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
