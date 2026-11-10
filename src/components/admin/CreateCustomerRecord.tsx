'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, UserPlus } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

/**
 * Appointments, invoices and messages belong to a customer record (Customers & CRM).
 * When a login has no record yet, this makes one from the login's name and email.
 */
export function CreateCustomerRecord({ fullName, email }: { fullName: string; email: string }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create() {
    setSaving(true)
    setError(null)
    const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
    const first = parts[0] || email.split('@')[0]
    const last = parts.slice(1).join(' ') || '-'
    const { error: insertError } = await createClient()
      .from('customers')
      .insert([{ first_name: first, last_name: last, email: email.trim().toLowerCase() }])
    setSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    window.dispatchEvent(new Event('customers-changed'))
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={create}
        disabled={saving || !email}
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-xl"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
        Create customer record
      </button>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  )
}
