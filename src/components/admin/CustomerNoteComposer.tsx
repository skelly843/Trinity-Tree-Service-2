'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

/**
 * Adds a note to a customer's record. "customer_visible" notes are messages the customer
 * reads (and can answer) in Portal > Messages; "internal" notes are only seen by staff.
 */
export function CustomerNoteComposer({
  customerId,
  visibility,
  placeholder,
  buttonLabel
}: {
  customerId: string
  visibility: 'internal' | 'customer_visible'
  placeholder: string
  buttonLabel: string
}) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const content = text.trim()
    if (!content) return
    setSending(true)
    setError(null)
    setSent(null)
    const supabase = createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Your sign-in has expired. Sign in again and retry.')
      setSending(false)
      return
    }
    const { error: insertError } = await supabase
      .from('notes')
      .insert([{ customer_id: customerId, content, visibility, author_id: user.id }])
    setSending(false)
    if (insertError) {
      setError(
        insertError.message.includes('row-level security')
          ? 'You can only add notes for customers assigned to you.'
          : insertError.message
      )
      return
    }
    setText('')
    setSent(visibility === 'customer_visible' ? 'Message sent. The customer sees it in their portal under Messages.' : 'Note saved.')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-3" id="compose">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex items-center justify-between gap-3">
        <p className={`text-xs font-semibold ${error ? 'text-red-600' : 'text-green-700'}`} role="status">
          {error || sent}
        </p>
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="shrink-0 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-xl"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {buttonLabel}
        </button>
      </div>
    </form>
  )
}
