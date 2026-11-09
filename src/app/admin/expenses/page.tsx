'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FileUpload } from '@/components/admin/FileUpload'
import { StoredFileLink } from '@/components/StoredFileLink'
import { EXPENSE_CATEGORIES, categoryLabel } from '@/utils/finance'
import { TrendingDown, Plus, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react'

export default function AdminExpensesPage() {
  const supabase = createClient()
  const [expenses, setExpenses] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    jobId: '',
    vendor: '',
    amount: '',
    category: 'Materials',
    description: '',
    internalNotes: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    receiptFileUrl: ''
  })

  const loadExpenses = async () => {
    setLoading(true)
    const { data: exps } = await supabase
      .from('expenses')
      .select('*, jobs(title)')
      .order('expense_date', { ascending: false })

    const { data: jobsList } = await supabase
      .from('jobs')
      .select('id, title, customer_id')

    setExpenses(exps || [])
    setJobs(jobsList || [])
    setLoading(false)
  }

  useEffect(() => {
    loadExpenses()
  }, [])

  const handleOpenNew = () => {
    setFormData({
      jobId: '',
      vendor: '',
      amount: '',
      category: 'Materials',
      description: '',
      internalNotes: '',
      expenseDate: new Date().toISOString().slice(0, 10),
      receiptFileUrl: ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const amountNum = Number(formData.amount)

    const { error: insErr } = await supabase
      .from('expenses')
      .insert([
        {
          job_id: formData.jobId || null,
          vendor: formData.vendor,
          amount: amountNum,
          category: formData.category,
          description: formData.description,
          internal_notes: formData.internalNotes,
          expense_date: formData.expenseDate,
          receipt_file_url: formData.receiptFileUrl || null
        }
      ])

    if (insErr) {
      setError(insErr.message)
    } else {
      setSuccess('Expense logged successfully!')
      setShowModal(false)
      loadExpenses()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this expense record?')) return
    const { error: delErr } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)

    if (delErr) {
      setError(delErr.message)
    } else {
      setSuccess('Expense record removed.')
      loadExpenses()
    }
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Expenses Ledger</h1>
          <p className="text-slate-500 mt-1">Record purchases of fixtures, copper tubing, vehicle fuel, or subcontracting costs.</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center space-x-1.5 shadow-md shadow-blue-100"
        >
          <Plus size={16} />
          <span>Log New Expense</span>
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
            <span className="text-sm font-bold text-slate-800">Business Expenses Ledger</span>
            <span className="text-xs font-semibold text-slate-500">{expenses.length} Logged Expenses</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Expense Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor / Store</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Job / Project</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {exp.expense_date || new Date(exp.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-bold">
                      {exp.vendor}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 capitalize">
                      {categoryLabel(exp.category)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-semibold truncate max-w-[150px]">
                      {exp.jobs?.title || 'General Overhead'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {exp.description}
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-red-600">
                      -${Number(exp.amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                      {exp.receipt_file_url && <StoredFileLink value={exp.receipt_file_url} label="Receipt" />}
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                      No business expenses logged. Click "Log New Expense" to build your ledger.
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
              <h2 className="text-xl font-bold">Log Business Expense</h2>
              <p className="text-xs text-slate-400 mt-1">Settle items, parts suppliers, and project cost centers.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Associated Job (Optional)</label>
                <select
                  value={formData.jobId}
                  onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="">-- Choose Job --</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Vendor / Store Name</label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g. Home Depot, Ferguson Plumbing Supply"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Amount Paid ($)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. 150"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Short Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g. Copper elbows and water filtration cartridge replacements"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Expense Date</label>
                <input
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>

              <FileUpload
                bucket="receipts"
                folder={jobs.find((j) => j.id === formData.jobId)?.customer_id || undefined}
                label="Receipt (optional)"
                value={formData.receiptFileUrl}
                onChange={(ref) => setFormData({ ...formData, receiptFileUrl: ref })}
              />

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Internal Ledger Notes</label>
                <textarea
                  value={formData.internalNotes}
                  onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-16"
                  placeholder="Private ledger notes..."
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
                  {saving ? 'Logging...' : 'Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
