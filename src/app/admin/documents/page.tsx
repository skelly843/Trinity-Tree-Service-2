'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, FolderOpen, Loader2, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { FileUpload } from '@/components/admin/FileUpload'
import { StoredFileLink } from '@/components/StoredFileLink'
import { parseStoredFile, storedFileName } from '@/utils/storedFiles'

const EMPTY = { customerId: '', fileName: '', fileRef: '', fileType: '', visible: true }

/** Contracts, permits, plans and photos shared with a customer in their portal. */
export default function AdminDocumentsPage() {
  const supabase = createClient()
  const [documents, setDocuments] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState<typeof EMPTY | null>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: docs, error: docsErr }, { data: custs }] = await Promise.all([
      supabase.from('documents').select('*, customers(first_name, last_name)').order('created_at', { ascending: false }),
      supabase.from('customers').select('id, first_name, last_name').order('last_name')
    ])
    if (docsErr) setError(docsErr.message)
    setDocuments(docs || [])
    setCustomers(custs || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    if (!form.fileRef) {
      setError('Upload the file first.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: insErr } = await supabase.from('documents').insert([
      {
        customer_id: form.customerId,
        file_url: form.fileRef,
        file_name: form.fileName.trim() || storedFileName(form.fileRef),
        file_type: form.fileType || null,
        is_visible_to_customer: form.visible
      }
    ])
    setSaving(false)
    if (insErr) {
      setError(insErr.message)
      return
    }
    setSuccess(form.visible ? 'Document shared with the customer.' : 'Document saved (staff only).')
    setForm(null)
    load()
  }

  const toggleVisible = async (doc: any) => {
    setError(null)
    const { error: updErr } = await supabase
      .from('documents')
      .update({ is_visible_to_customer: !doc.is_visible_to_customer })
      .eq('id', doc.id)
    if (updErr) setError(updErr.message)
    else load()
  }

  const handleDelete = async (doc: any) => {
    if (!confirm(`Delete "${doc.file_name}"? The customer will no longer see it.`)) return
    setError(null)
    const { error: delErr } = await supabase.from('documents').delete().eq('id', doc.id)
    if (delErr) {
      setError(delErr.message)
      return
    }
    const stored = parseStoredFile(doc.file_url)
    if (stored) await supabase.storage.from(stored.bucket).remove([stored.path])
    setSuccess('Document deleted.')
    load()
  }

  const input = 'w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Customer Documents</h1>
          <p className="text-slate-500 mt-1">Share contracts, permits, plans and photos. Customers see them under My Documents.</p>
        </div>
        <button
          onClick={() => {
            setError(null)
            setSuccess(null)
            setForm({ ...EMPTY })
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-1.5 shadow-md"
        >
          <Plus size={16} />
          <span>Add Document</span>
        </button>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-sm font-semibold text-green-700 flex items-center">
          <CheckCircle2 size={16} className="mr-2" /> {success}
        </div>
      )}
      {error && !form && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm font-semibold text-red-700 flex items-center">
          <AlertCircle size={16} className="mr-2" /> {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 flex justify-center">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {documents.map((doc) => (
            <div key={doc.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <FolderOpen size={20} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{doc.file_name}</p>
                  <p className="text-xs text-slate-500">
                    {doc.customers ? `${doc.customers.first_name} ${doc.customers.last_name}` : 'No customer'}
                    {doc.file_type ? ` • ${doc.file_type}` : ''} • {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleVisible(doc)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                    doc.is_visible_to_customer
                      ? 'text-green-700 bg-green-50 border-green-100'
                      : 'text-slate-600 bg-slate-100 border-slate-200'
                  }`}
                  title="Click to change who can see it"
                >
                  {doc.is_visible_to_customer ? 'Customer can see' : 'Staff only'}
                </button>
                <StoredFileLink value={doc.file_url} label="Open" />
                <button onClick={() => handleDelete(doc)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg" aria-label="Delete document">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {documents.length === 0 && (
            <p className="p-12 text-center text-slate-400 italic text-sm">No documents yet. Click Add Document to share one.</p>
          )}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 overflow-y-auto">
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 my-8">
            <h2 className="text-xl font-bold text-slate-900">Add Document</h2>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Customer</span>
              <select
                required
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value, fileRef: '' })}
                className={`${input} bg-white`}
              >
                <option value="">-- Choose Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                ))}
              </select>
            </label>
            {form.customerId ? (
              <FileUpload
                bucket="customer-files"
                folder={form.customerId}
                label="File"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                value={form.fileRef}
                onChange={(fileRef, file) =>
                  setForm({
                    ...form,
                    fileRef,
                    fileName: form.fileName || (file?.name ?? ''),
                    fileType: file ? (file.name.split('.').pop() || '').toUpperCase() : ''
                  })
                }
              />
            ) : (
              <p className="text-xs text-slate-500">Choose the customer first, so the file is stored in their private folder.</p>
            )}
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Name shown to the customer</span>
              <input value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} className={input} placeholder="e.g. Signed contract" />
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-700">
              <input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} />
              Show in the customer&apos;s portal
            </label>
            {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
            <div className="flex justify-between pt-2">
              <button type="button" onClick={() => setForm(null)} className="px-5 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 text-sm">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold text-sm disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Document'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
