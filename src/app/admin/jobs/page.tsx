'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Briefcase, AlertCircle, CheckCircle2, Loader2, Plus, Edit, Trash2 } from 'lucide-react'

export default function AdminJobsPage() {
  const supabase = createClient()
  const [jobs, setJobs] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // modal editing toggles
  const [staff, setStaff] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    customerId: '',
    title: '',
    description: '',
    status: 'lead',
    priority: 'medium',
    totalAmount: '',
    paymentStatus: 'unpaid',
    assignedAdminId: ''
  })

  const loadJobs = async () => {
    setLoading(true)
    const { data: jobsList } = await supabase
      .from('jobs')
      .select('*, customers(first_name, last_name, email)')
      .order('created_at', { ascending: false })

    const { data: custs } = await supabase
      .from('customers')
      .select('id, first_name, last_name')

    const { data: staffList } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['global_admin', 'admin', 'employee'])
      .order('full_name')
    setStaff(staffList || [])
    setJobs(jobsList || [])
    setCustomers(custs || [])
    setLoading(false)
  }

  useEffect(() => {
    loadJobs()
  }, [])

  const handleOpenNew = () => {
    setEditingId(null)
    setFormData({
      customerId: '',
      title: '',
      description: '',
      status: 'lead',
      priority: 'medium',
      totalAmount: '',
      paymentStatus: 'unpaid',
      assignedAdminId: ''
    })
    setShowModal(true)
  }

  const handleOpenEdit = (job: any) => {
    setEditingId(job.id)
    setFormData({
      customerId: job.customer_id || '',
      title: job.title || '',
      description: job.description || '',
      status: job.status || 'lead',
      priority: job.priority || 'medium',
      totalAmount: job.total_amount ? String(job.total_amount) : '',
      paymentStatus: job.payment_status || 'unpaid',
      assignedAdminId: job.assigned_admin_id || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const payload = {
      customer_id: formData.customerId,
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      total_amount: formData.totalAmount ? Number(formData.totalAmount) : 0,
      payment_status: formData.paymentStatus,
      assigned_admin_id: formData.assignedAdminId || null,
      updated_at: new Date().toISOString()
    }

    let result
    if (editingId) {
      result = await supabase
        .from('jobs')
        .update(payload)
        .eq('id', editingId)
    } else {
      result = await supabase
        .from('jobs')
        .insert([payload])
    }

    if (result.error) {
      setError(result.error.message)
    } else {
      setSuccess('Job saved successfully!')
      setShowModal(false)
      loadJobs()

      // Audit Log insertion
      await supabase.from('audit_logs').insert([
        {
          action: editingId ? 'job_edited' : 'job_created',
          target_type: 'job',
          details: { title: formData.title }
        }
      ])
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this job?')) return
    const { error: delErr } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id)

    if (delErr) {
      setError(delErr.message)
    } else {
      setSuccess('Job removed successfully.')
      loadJobs()
    }
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Jobs & Projects</h1>
          <p className="text-slate-500 mt-1">Manage tree removals, trimming, stump grinding, land clearing and storm cleanup.</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center space-x-1.5 shadow-md shadow-blue-100"
        >
          <Plus size={16} />
          <span>New Job Project</span>
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
            <span className="text-sm font-bold text-slate-800">Active Job Pipeline</span>
            <span className="text-xs font-semibold text-slate-500">{jobs.length} Jobs Total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Job Title</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{job.title}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px] mt-0.5">{job.description}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                      {job.customers?.first_name} {job.customers?.last_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 border border-blue-100 text-blue-700">
                        {job.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800">
                      ${Number(job.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        job.payment_status === 'paid' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {job.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEdit(job)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                      No jobs found. Click "New Job Project" to create one.
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
              <h2 className="text-xl font-bold">{editingId ? 'Edit Job Project' : 'New Job Project'}</h2>
              <p className="text-xs text-slate-400 mt-1">Set the customer, arborist, status, priority and price.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Select CRM Customer</label>
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
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Assigned arborist</label>
                <select
                  value={formData.assignedAdminId}
                  onChange={(e) => setFormData({ ...formData, assignedAdminId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="">-- Not assigned yet --</option>
                  {staff.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">They see this job, the customer and the address in their employee area, and the customer sees who to expect.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Job / Project Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g. Oak Removal & Stump Grinding"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Short Summary</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-16"
                  placeholder="Goals, requirements, materials..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="lead">Lead</option>
                    <option value="estimate_pending">Estimate Pending</option>
                    <option value="estimate_sent">Estimate Sent</option>
                    <option value="approved">Approved</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_on_parts">Waiting on Parts</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Contract Amount ($)</label>
                  <input
                    type="number"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="2500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Payment Status</label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="paid">Paid</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
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
                  {saving ? 'Saving...' : 'Save Job Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
