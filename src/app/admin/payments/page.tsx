'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CreditCard, Plus, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react'

export default function AdminPaymentsPage() {
  const supabase = createClient()
  const [payments, setPayments] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    customerId: '',
    invoiceId: '',
    amount: '',
    paymentMethod: 'stripe',
    referenceNumber: '',
    internalNotes: ''
  })

  const loadPayments = async () => {
    setLoading(true)
    const { data: pays } = await supabase
      .from('payments')
      .select('*, customers(first_name, last_name, email), invoices(invoice_number)')
      .order('payment_date', { ascending: false })

    const { data: custs } = await supabase
      .from('customers')
      .select('id, first_name, last_name')

    const { data: invs } = await supabase
      .from('invoices')
      .select('id, invoice_number, total')

    setPayments(pays || [])
    setCustomers(custs || [])
    setInvoices(invs || [])
    setLoading(false)
  }

  useEffect(() => {
    loadPayments()
  }, [])

  const handleOpenNew = () => {
    setFormData({
      customerId: '',
      invoiceId: '',
      amount: '',
      paymentMethod: 'stripe',
      referenceNumber: '',
      internalNotes: ''
    })
    setShowModal(true)
  }

  // A database trigger updates the invoice once a payment is confirmed
  const handleReview = async (id: string, status: 'confirmed' | 'rejected') => {
    setError(null)
    setSuccess(null)

    const { data, error: updErr } = await supabase.from('payments').update({ status }).eq('id', id).select('id')

    if (updErr) {
      setError(updErr.message)
    } else if (!data || data.length === 0) {
      setError('You do not have access to change this payment.')
    } else {
      setSuccess(status === 'confirmed' ? 'Payment confirmed and invoice updated.' : 'Payment rejected.')
      loadPayments()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const amountNum = Number(formData.amount)

    const { error: insErr } = await supabase
      .from('payments')
      .insert([
        {
          customer_id: formData.customerId,
          invoice_id: formData.invoiceId,
          amount: amountNum,
          payment_method: formData.paymentMethod,
          reference_number: formData.referenceNumber,
          internal_notes: formData.internalNotes
        }
      ])

    if (insErr) {
      setError(insErr.message)
    } else {
      setSuccess('Payment registered and reconciled successfully!')
      setShowModal(false)
      loadPayments()

      await supabase.from('audit_logs').insert([
        {
          action: 'payment_recorded',
          target_type: 'payment',
          details: { amount: amountNum }
        }
      ])
    }
    setSaving(false)
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Payments Reconciler</h1>
          <p className="text-slate-500 mt-1">Trace processed transactions, register offline cash/checks, and update invoice records.</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center space-x-1.5 shadow-md shadow-blue-100"
        >
          <Plus size={16} />
          <span>Record New Payment</span>
        </button>
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
        <div className="p-12 flex justify-center items-center">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800">Recorded Client Payments</span>
            <span className="text-xs font-semibold text-slate-500">{payments.length} Payments Total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reference #</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount Paid</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {p.payment_date || new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-semibold">
                      {p.customers?.first_name} {p.customers?.last_name}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-slate-700">
                      INV-{p.invoices?.invoice_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 capitalize">
                      {p.payment_method}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                      {p.reference_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-green-600">
                      +${Number(p.amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {p.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleReview(p.id, 'confirmed')} className="px-3 py-1.5 rounded-lg text-xs font-bold border text-green-600 bg-green-50 border-green-100 hover:bg-green-100">
                            Confirm
                          </button>
                          <button onClick={() => handleReview(p.id, 'rejected')} className="px-3 py-1.5 rounded-lg text-xs font-bold border text-red-600 bg-red-50 border-red-100 hover:bg-red-100">
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold capitalize text-slate-500">{p.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                      No payments recorded yet. Click "Record New Payment" to book a client transaction.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-6">
              <h2 className="text-xl font-bold">Record Customer Payment</h2>
              <p className="text-xs text-slate-400 mt-1">Settle invoices, select payment methods, and record references.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Select Customer</label>
                <select
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

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Select Outstanding Invoice</label>
                <select
                  value={formData.invoiceId}
                  onChange={(e) => setFormData({ ...formData, invoiceId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  required
                >
                  <option value="">-- Choose Invoice --</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>INV-{inv.invoice_number} (Total: ${inv.total})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Amount Paid ($)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. 500"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="stripe">Stripe</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Reference Number (Optional)</label>
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Check #, Transaction Hash, Stripe ID..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Internal Reconciler Notes</label>
                <textarea
                  value={formData.internalNotes}
                  onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-16"
                  placeholder="Private reconciliation details..."
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold transition-all shadow-md text-xs disabled:opacity-50"
                >
                  {saving ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
