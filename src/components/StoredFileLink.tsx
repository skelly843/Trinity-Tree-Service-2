'use client'

import { useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { resolveStoredFileUrl } from '@/utils/storedFiles'

/** Opens an uploaded file, making a short-lived secure link for private files. */
export function StoredFileLink({ value, label = 'View file', className }: { value?: string | null; label?: string; className?: string }) {
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!value) return <span className="text-xs text-slate-400">No file</span>

  const open = async () => {
    setOpening(true)
    setError(null)
    // Open the tab during the click so the browser does not block it as a popup
    const tab = window.open('', '_blank')
    try {
      const url = await resolveStoredFileUrl(createClient(), value)
      if (!url) throw new Error('This file link is not valid.')
      if (tab) tab.location.href = url
      else window.location.href = url
    } catch (err: any) {
      tab?.close()
      setError(err?.message || 'Could not open the file.')
    } finally {
      setOpening(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={open}
        disabled={opening}
        className={
          className ||
          'inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm disabled:opacity-60'
        }
      >
        {opening ? <Loader2 className="animate-spin" size={12} /> : <ExternalLink size={12} />}
        {label}
      </button>
      {error && <span role="alert" className="text-[11px] text-red-600">{error}</span>}
    </span>
  )
}
