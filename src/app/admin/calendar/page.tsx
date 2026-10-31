'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Calendar as CalendarIcon, Clock, Plus, Edit2, AlertCircle, Trash2, CheckCircle2, User, Home, HelpCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

export default function AdminCalendarPage() {
  const supabase = createClient()
  const [appointments, setAppointments] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [serviceRequests, setServiceRequests] = useState<any[]>([])
  const [admins, setAdmins] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Current view modes: 'month', 'week', 'day', 'agenda'
  const [currentView, setCurrentView] = useState<'month' | 'agenda'>('agenda')

  // Form Modal toggle & editing state
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form Fields state
  const [formData, setFormData] = useState({
    customerId: '',
    propertyId: '',
    assignedAdminId: '',
    serviceRequestId: '',
    scheduledAt: '',
    durationMinutes: 60,
    status: 'pending',
    serviceType: '',
    color: '#3b82f6',
    isAllDay: false,
    notes: '',
    internalNotes: '',
    totalPrice: '',
  })

  const loadData = async () => {
    setLoading(true)

    const { data: apts } = await supabase
      .from('appointments')
      .select('*, customers(first_name, last_name, email), customer_properties(address_line, city), profiles(full_name)')
      .order('scheduled_at', { ascending: true })

    const { data: custs } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email')

    const { data: props } = await supabase
      .from('customer_properties')
      .select('id, address_line, city, customer_id')

    const { data: reqs } = await supabase
      .from('service_requests')
      .select('id, service_requested, email, first_name, last_name')
      .eq('status', 'new')

    const { data: staff } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['global_admin', 'admin', 'employee'])

    // Internal notes live in a staff-only table, away from customer-readable rows
    const { data: staffNotes } = await supabase
      .from('internal_record_notes')
      .select('record_id, internal_notes')
      .eq('record_type', 'appointment')
    const notesById = new Map((staffNotes || []).map((n: any) => [n.record_id, n.internal_notes]))

    setAppointments((apts || []).map((apt: any) => ({ ...apt, internal_notes: notesById.get(apt.id) ?? apt.internal_notes })))
    setCustomers(custs || [])
    setProperties(props || [])
    setServiceRequests(reqs || [])
    setAdmins(staff || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenNew = () => {
    setEditingId(null)
    setFormData({
      customerId: '',
      propertyId: '',
      assignedAdminId: '',
      serviceRequestId: '',
      scheduledAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      durationMinutes: 60,
      status: 'pending',
      serviceType: '',
      color: '#3b82f6',
      isAllDay: false,
      notes: '',
      internalNotes: '',
      totalPrice: '',
    })
    setError(null)
    setSuccess(null)
    setShowModal(true)
  }

  const handleOpenEdit = (apt: any) => {
    setEditingId(apt.id)
    setFormData({
      customerId: apt.customer_id || '',
      propertyId: apt.property_id || '',
      assignedAdminId: apt.assigned_admin_id || '',
      serviceRequestId: apt.service_request_id || '',
      scheduledAt: format(new Date(apt.scheduled_at), "yyyy-MM-dd'T'HH:mm"),
      durationMinutes: apt.duration_minutes || 60,
      status: apt.status || 'pending',
      serviceType: apt.service_type || '',
      color: apt.color || '#3b82f6',
      isAllDay: apt.is_all_day || false,
      notes: apt.notes || '',
      internalNotes: apt.internal_notes || '',
      totalPrice: apt.total_price ? String(apt.total_price) : '',
    })
    setError(null)
    setSuccess(null)
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    // Check scheduling conflicts / overlaps
    const startSelected = new Date(formData.scheduledAt).getTime()
    const endSelected = startSelected + formData.durationMinutes * 60 * 1000

    const conflict = appointments.find((apt) => {
      if (editingId && apt.id === editingId) return false
      // Match on the same assigned staff/admin
      if (formData.assignedAdminId && apt.assigned_admin_id === formData.assignedAdminId) {
        const aptStart = new Date(apt.scheduled_at).getTime()
        const aptEnd = aptStart + (apt.duration_minutes || 60) * 60 * 1000
        return (startSelected < aptEnd && endSelected > aptStart)
      }
      return false
    })

    if (conflict) {
      setError(`Conflict Detected: Staff is already booked for another appointment starting at ${format(new Date(conflict.scheduled_at), 'p')}!`)
      setSubmitting(false)
      return;
    }

    const payload = {
      customer_id: formData.customerId || null,
      property_id: formData.propertyId || null,
      assigned_admin_id: formData.assignedAdminId || null,
      service_request_id: formData.serviceRequestId || null,
      scheduled_at: new Date(formData.scheduledAt).toISOString(),
      duration_minutes: formData.durationMinutes,
      status: formData.status,
      service_type: formData.serviceType,
      color: formData.color,
      is_all_day: formData.isAllDay,
      notes: formData.notes,
      internal_notes: formData.internalNotes,
      total_price: formData.totalPrice ? Number(formData.totalPrice) : null,
    }

    let result
    if (editingId) {
      result = await supabase
        .from('appointments')
        .update(payload)
        .eq('id', editingId)
    } else {
      result = await supabase
        .from('appointments')
        .insert([payload])
    }

    if (result.error) {
      setError(result.error.message)
    } else {
      setSuccess('Appointment successfully saved!')
      setShowModal(false)
      loadData()
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to cancel / remove this appointment?')) return

    const { error: delErr } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)

    if (delErr) {
      setError(delErr.message)
    } else {
      setSuccess('Appointment cancelled successfully.')
      loadData()
    }
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Scheduling & Dispatch Calendar</h1>
          <p className="text-slate-500 mt-1">Assign technicians, handle customer booking times, and map tasks.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setCurrentView('agenda')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentView === 'agenda' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Agenda View
            </button>
          </div>

          <button
            onClick={handleOpenNew}
            className="flex items-center space-x-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
          >
            <Plus size={16} />
            <span>Create Appointment</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center text-sm font-semibold text-green-700">
          <CheckCircle2 size={18} className="mr-2" />
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center text-sm font-semibold text-red-700">
          <AlertCircle size={18} className="mr-2" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 flex justify-center items-center">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Calendar Header info */}
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800">Scheduled Dispatch Queue</span>
            <span className="text-xs font-semibold text-slate-500">{appointments.length} Scheduled Jobs</span>
          </div>

          <div className="p-6 divide-y divide-slate-100">
            {appointments.map((apt) => (
              <div key={apt.id} className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0">
                <div className="flex items-start space-x-4">
                  <div className="w-2.5 h-14 rounded-full shrink-0" style={{ backgroundColor: apt.color || '#3b82f6' }} />
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-lg">{apt.service_type}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center font-semibold text-blue-600">
                        <Clock size={13} className="mr-1 text-blue-500" />
                        {format(new Date(apt.scheduled_at), 'PPPP p')} ({apt.duration_minutes} min)
                      </span>
                      {apt.customers && (
                        <span className="flex items-center">
                          <User size={13} className="mr-1 text-slate-400" />
                          Client: {apt.customers.first_name} {apt.customers.last_name}
                        </span>
                      )}
                      {apt.customer_properties && (
                        <span className="flex items-center">
                          <Home size={13} className="mr-1 text-slate-400" />
                          Address: {apt.customer_properties.address_line}, {apt.customer_properties.city}
                        </span>
                      )}
                    </div>
                    {apt.notes && <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100 inline-block mt-2">{apt.notes}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                    apt.status === 'completed'
                      ? 'bg-green-50 text-green-700 border-green-100'
                      : apt.status === 'cancelled'
                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                      : 'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                    {apt.status}
                  </span>

                  <button
                    onClick={() => handleOpenEdit(apt)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(apt.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {appointments.length === 0 && (
              <div className="p-12 text-center text-slate-400 italic">
                No active appointments scheduled. Click "Create Appointment" to schedule your first job.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Appointment Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-6">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Appointment' : 'New Appointment Scheduling'}</h2>
              <p className="text-xs text-slate-400 mt-1">Configure technicians, dispatch times, and service types.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Customer selection */}
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
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.email})</option>
                  ))}
                </select>
              </div>

              {/* Property selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Select Property Address</label>
                <select
                  value={formData.propertyId}
                  onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="">-- Choose Property --</option>
                  {properties
                    .filter((p) => p.customer_id === formData.customerId || !formData.customerId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.address_line}, {p.city}</option>
                    ))}
                </select>
              </div>

              {/* Tech / Admin Assignment */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Assigned Tech / Admin</label>
                <select
                  value={formData.assignedAdminId}
                  onChange={(e) => setFormData({ ...formData, assignedAdminId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="">-- Choose Dispatch Tech --</option>
                  {admins.map((staff) => (
                    <option key={staff.id} value={staff.id}>{staff.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Scheduled time & duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Scheduled At</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 60 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Service Type & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Service Title / Type</label>
                  <input
                    type="text"
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g. Drain Unblocking"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </select>
                </div>
              </div>

              {/* Color Code Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Calendar Color</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-xl p-1"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Price (Est)</label>
                  <input
                    type="number"
                    value={formData.totalPrice}
                    onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="99.00"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Customer Visible Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-16"
                  placeholder="Notes shown in the customer portal..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Internal Admin Notes</label>
                <textarea
                  value={formData.internalNotes}
                  onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-16"
                  placeholder="Private notes for technicians only..."
                />
              </div>

              {/* Action buttons */}
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
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold transition-all shadow-md text-xs disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
