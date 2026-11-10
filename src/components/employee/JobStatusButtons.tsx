'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, Play } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

/** Lets the assigned worker start or finish a job. Finishing it makes its pay owed. */
export function JobStatusButtons({ jobId, status }: { jobId: string; status: string }) {
  const router = useRouter()
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function setStatus(next: 'in_progress' | 'completed') {
    if (next === 'completed' && !confirm('Mark this job as completed?')) return
    setSaving(next)
    setError(null)
    const fields: Record<string, string> = { status: next }
    if (next === 'completed') fields.actual_completion_date = new Date().toISOString().slice(0, 10)
    const { data, error: updateError } = await createClient().from('jobs').update(fields).eq('id', jobId).select('id')
    setSaving(null)
    if (updateError || !data?.length) {
      setError(updateError?.message || 'You can only update jobs assigned to you.')
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== 'in_progress' && (
        <button
          type="button"
          onClick={() => setStatus('in_progress')}
          disabled={!!saving}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
        >
          {saving === 'in_progress' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Start
        </button>
      )}
      <button
        type="button"
        onClick={() => setStatus('completed')}
        disabled={!!saving}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
      >
        {saving === 'completed' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Mark completed
      </button>
      {error && <p className="w-full text-xs font-semibold text-red-600">{error}</p>}
    </div>
  )
}
