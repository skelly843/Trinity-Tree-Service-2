'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, UserPlus, X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { sendPortalInvite } from './CustomerPortalAccess'

const EMPTY = { first_name: '', last_name: '', business_name: '', email: '', phone: '', billing_address: '' }

const FIELDS: { key: keyof typeof EMPTY; label: string; type?: string; required?: boolean }[] = [
  { key: 'first_name', label: 'First name', required: true },
  { key: 'last_name', label: 'Last name', required: true },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'business_name', label: 'Business name' },
  { key: 'billing_address', label: 'Billing address' }
]

/** Creates a customer record, which jobs, estimates, invoices and appointments are linked to. */
export function AddCustomerForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [invite, setInvite] = useState(true)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(null)
    const { data: created, error: insertError } = await createClient()
      .from('customers')
      .insert([{ ...form, email: form.email.trim().toLowerCase() }])
      .select('id')
      .single()
    if (insertError || !created) {
      setSaving(false)
      setError(insertError?.message || 'The customer was not saved.')
      return
    }
    let note = 'They can now be picked on jobs, estimates and invoices.'
    if (invite) {
      const result = await sendPortalInvite(created.id)
      note = result.ok ? `${result.message} They will appear under Customer Portal Access.` : `The invitation was not sent: ${result.message}`
    }
    setSaving(false)
    window.dispatchEvent(new Event('customers-changed'))
    setSaved(`${form.first_name} ${form.last_name} added. ${note}`)
    setForm(EMPTY)
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold"
        >
          <Plus size={16} />
          Add customer
        </button>
        {saved && <p className="text-sm font-medium text-green-700">{saved}</p>}
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <UserPlus size={18} className="text-blue-600" />
          Add customer
        </h2>
        <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map((field) => (
          <label key={field.key} className="block space-y-1 text-sm font-medium text-slate-700">
            <span>{field.label}</span>
            <input
              type={field.type || 'text'}
              required={field.required}
              value={form[field.key]}
              onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        ))}
      </div>
      <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-700">
        <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)} />
        Email them an invitation to create a customer portal login
      </label>
      {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60"
      >
        {saving && <Loader2 className="animate-spin" size={16} />}
        Save customer
      </button>
    </form>
  )
}
