'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, TreePine } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

/**
 * The customer's main arborist. That person sees the customer, their properties, notes,
 * files and photos in the employee area, and the customer sees their name in the portal.
 */
export function AssignArborist({
  customerId,
  currentId,
  staff
}: {
  customerId: string
  currentId: string | null
  staff: { id: string; full_name: string | null; email: string | null }[]
}) {
  const router = useRouter()
  const [value, setValue] = useState(currentId || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function save(next: string) {
    setValue(next)
    setSaving(true)
    setMessage(null)
    const { data, error } = await createClient()
      .from('customers')
      .update({ assigned_admin_id: next || null })
      .eq('id', customerId)
      .select('id')
    setSaving(false)
    if (error || !data?.length) {
      setValue(currentId || '')
      setMessage({ ok: false, text: error?.message || 'Only the office can change the assigned arborist.' })
      return
    }
    setMessage({ ok: true, text: next ? 'Saved. They can now see this customer, and the customer sees who to expect.' : 'Saved.' })
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-400 uppercase block" htmlFor="assigned-arborist">
        Assigned arborist
      </label>
      <div className="relative">
        <TreePine size={16} className="absolute left-3 top-2.5 text-slate-400" />
        <select
          id="assigned-arborist"
          value={value}
          disabled={saving}
          onChange={(e) => save(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Not assigned</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name || s.email}
            </option>
          ))}
        </select>
        {saving && <Loader2 size={16} className="absolute right-3 top-2.5 animate-spin text-slate-400" />}
      </div>
      {message && <p className={`text-xs font-semibold ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>}
    </div>
  )
}
