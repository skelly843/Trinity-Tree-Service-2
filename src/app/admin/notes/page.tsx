'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { MessageSquare, Plus, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react'

export default function AdminNotesPage() {
  const supabase = createClient()
  const [notes, setNotes] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    customerId: '',
    content: '',
    visibility: 'internal'
  })

  const loadNotes = async () => {
    setLoading(true)
    const { data: notesList } = await supabase
      .from('notes')
      .select('*, customers(first_name, last_name), profiles(full_name)')
      .order('created_at', { ascending: false })

    const { data: custs } = await supabase
      .from('customers')
      .select('id, first_name, last_name')

    setNotes(notesList || [])
    setCustomers(custs || [])
    setLoading(false)
  }

  useEffect(() => {
    loadNotes()
  }, [])

  const handleOpenNew = () => {
    setFormData({
      customerId: '',
      content: '',
      visibility: 'internal'
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const { data: { user } } = await supabase.auth.getUser()

    const { error: insErr } = await supabase
      .from('notes')
      .insert([
        {
          customer_id: formData.customerId || null,
          content: formData.content,
          visibility: formData.visibility,
          author_id: user?.id || null
        }
      ])

    if (insErr) {
      setError(insErr.message)
    } else {
      setSuccess('Note added successfully!')
      setShowModal(false)
      loadNotes()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return
    const { error: delErr } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)

    if (delErr) {
      setError(delErr.message)
    } else {
      setSuccess('Note deleted.')
      loadNotes()
    }
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CRM Notes</h1>
          <p className="text-slate-500 mt-1">Post private notes for the crew, or progress updates the customer sees in their portal.</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center space-x-1.5 shadow-md shadow-blue-100"
        >
          <Plus size={16} />
          <span>Add CRM Note</span>
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
            <span className="text-sm font-bold text-slate-800">Notes Directory</span>
            <span className="text-xs font-semibold text-slate-500">{notes.length} Notes Total</span>
          </div>

          <div className="p-6 divide-y divide-slate-100">
            {notes.map((note) => (
              <div key={note.id} className="py-5 flex items-start justify-between gap-4 first:pt-0 last:pb-0">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">
                      Author: {note.profiles?.full_name || 'System / Staff'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                      note.visibility === 'customer_visible'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {note.visibility}
                    </span>
                    {note.customers && (
                      <span className="text-xs font-semibold text-blue-600">
                        &bull; Customer: {note.customers.first_name} {note.customers.last_name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-100 max-w-2xl">
                    {note.content}
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {new Date(note.created_at).toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(note.id)}
                  className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all self-center"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {notes.length === 0 && (
              <div className="p-12 text-center text-slate-400 italic">
                No CRM notes logged. Click "Add CRM Note" to register internal or customer visible entries.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white p-6">
              <h2 className="text-xl font-bold">Write CRM Note</h2>
              <p className="text-xs text-slate-400 mt-1">Settle content, visibility controls, and client mappings.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Map to Customer (Optional)</label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="">-- No Customer Link --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Visibility Setting</label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="internal">Internal (staff and crew only)</option>
                  <option value="customer_visible">Customer Visible (Shown in Customer Portal)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Note Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-32"
                  placeholder="Enter notes, dispatch summaries, status descriptions, tools needed..."
                  required
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
                  {saving ? 'Saving...' : 'Add Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
