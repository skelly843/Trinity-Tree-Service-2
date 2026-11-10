'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FileUpload } from '@/components/admin/FileUpload'
import { StoredFileLink } from '@/components/StoredFileLink'
import { Receipt, Plus, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react'

export default function AdminReceiptsPage() {
  const supabase = createClient()
  const [receipts, setReceipts] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    customerId: '',
    amount: '',
    description: '',
    receiptFileUrl: '',
    isVisibleToCustomer: false
  })

  const loadReceipts = async () => {
    setLoading(true)
    const { data: recs } = await supabase
      .from('receipts')
      .select('*, customers(first_name, last_name, email)')
      .order('receipt_date', { ascending: false })

    const { data: custs } = await supabase
      .from('customers')
      .select('id, first_name, last_name')

    setReceipts(recs || [])
    setCustomers(custs || [])
    setLoading(false)
  }

  useEffect(() => {
    loadReceipts()
  }, [])

  const handleOpenNew = () => {
    setFormData({
      customerId: '',
      amount: '',
      description: '',
      receiptFileUrl: '',
      isVisibleToCustomer: false
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.receiptFileUrl) {
      setError('Upload the receipt photo or PDF first.')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)

    const { error: insErr } = await supabase
      .from('receipts')
      .insert([
        {
          customer_id: formData.customerId || null,
          amount: Number(formData.amount),
          description: formData.description,
          receipt_file_url: formData.receiptFileUrl,
          is_visible_to_customer: formData.isVisibleToCustomer
        }
      ])

    if (insErr) {
      setError(insErr.message)
    } else {
      setSuccess('Receipt registered successfully!')
      setShowModal(false)
      loadReceipts()

      await supabase.from('audit_logs').insert([
        {
          action: 'receipt_uploaded',
          target_type: 'receipt',
          details: { description: formData.description }
        }
      ])
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this receipt?')) return
    const { error: delErr } = await supabase
      .from('receipts')
      .delete()
      .eq('id', id)

    if (delErr) {
      setError(delErr.message)
    } else {
      setSuccess('Receipt removed.')
      loadReceipts()
    }
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Receipt Manager</h1>
          <p className="text-slate-500 mt-1">Upload parts receipts, equipment rentals, and material proofs for client review.</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center space-x-1.5 shadow-md shadow-blue-100"
        >
          <Plus size={16} />
          <span>Upload Receipt Record</span>
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
            <span className="text-sm font-bold text-slate-800">Billed Materials & Receipts</span>
            <span className="text-xs font-semibold text-slate-500">{receipts.length} Receipts Registered</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client Visibility</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount Billed</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {receipts.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {rec.receipt_date || new Date(rec.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-semibold">
                      {rec.customers ? `${rec.customers.first_name} ${rec.customers.last_name}` : 'General Expense'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {rec.description || 'Materials Invoice'}
                    </td>
                    <td className="px-6 py-4">
                      {rec.is_visible_to_customer ? (
                        <span className="inline-flex px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-100 text-[10px] font-bold uppercase tracking-wider">
                          Visible to Portal
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                          Internal Only
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">
                      ${Number(rec.amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                      <StoredFileLink value={rec.receipt_file_url} label="View" />
                      <button
                        onClick={() => handleDelete(rec.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {receipts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                      No material receipts uploaded. Click "Upload Receipt Record" to enter proofs.
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
              <h2 className="text-xl font-bold">Register Receipt Proof</h2>
              <p className="text-xs text-slate-400 mt-1">Settle billed components, parts description, and customer visibility toggles.</p>
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
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Parts / Service Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g. Stump grinder rental, dump fees"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Billed Amount ($)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="120"
                  required
                />
              </div>

              <FileUpload
                bucket="receipts"
                folder={formData.customerId || undefined}
                label="Receipt photo or PDF"
                value={formData.receiptFileUrl}
                onChange={(ref) => setFormData({ ...formData, receiptFileUrl: ref })}
              />

              <div className="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <input
                  type="checkbox"
                  id="isVisibleToCustomer"
                  checked={formData.isVisibleToCustomer}
                  onChange={(e) => setFormData({ ...formData, isVisibleToCustomer: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="isVisibleToCustomer" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Visible to Customer Portal (They can download receipts)
                </label>
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
                  {saving ? 'Registering...' : 'Register Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
