'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Loader2, MessageSquare, Send, CheckCircle2, AlertCircle } from 'lucide-react'

export default function CustomerNotesMessagesPage() {
  const supabase = createClient()
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [messageText, setMessageText] = useState('')

  const loadMessages = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email || '')
        .limit(1)
        .maybeSingle()

      if (customer) {
        const { data } = await supabase
          .from('notes')
          .select('*, profiles(full_name)')
          .eq('customer_id', customer.id)
          .eq('visibility', 'customer_visible')
          .order('created_at', { ascending: true })
        setNotes(data || [])
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadMessages()
  }, [])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim()) return

    setSending(true)
    setError(null)
    setSuccess(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setSending(false)
      return;
    }

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', user.email || '')
      .limit(1)
      .maybeSingle()

    if (!customer) {
      setError('No customer CRM profile found. Please contact administration.')
      setSending(false)
      return;
    }

    const { error: insErr } = await supabase
      .from('notes')
      .insert([
        {
          customer_id: customer.id,
          content: messageText.trim(),
          visibility: 'customer_visible',
          author_id: user.id
        }
      ])

    if (insErr) {
      setError(insErr.message)
    } else {
      setSuccess('Message sent to the administration portal successfully!')
      setMessageText('')
      loadMessages()
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col">

      <main className="max-w-4xl mx-auto px-6 py-12 w-full space-y-6 flex-1 flex flex-col justify-between">
        <div className="space-y-6 w-full">

          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center">
              <MessageSquare className="mr-2 text-blue-600" size={28} />
              Portal Messaging Center
            </h1>
            <p className="text-slate-500 mt-1">Message our office about your job, ask to change a visit, or send a note.</p>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center items-center bg-white rounded-2xl border border-slate-200 shadow-sm">
              <Loader2 className="animate-spin text-blue-600" size={24} />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 max-h-[50vh] overflow-y-auto">
              {notes.map((msg) => {
                const isAuthorMe = msg.profiles ? true : false // if profile exists, it is authored by the customer or admin. Wait, let's distinguish.
                // Our schema author_id is profile_id. Profiles has role 'customer' or 'admin'. Let's check roles if possible or just display full_name.
                return (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-400">
                        {msg.profiles?.full_name || 'CRM Administrator'}
                      </span>
                      <span className="text-[10px] text-slate-300">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-700 font-semibold max-w-xl">
                      {msg.content}
                    </p>
                  </div>
                )
              })}
              {notes.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic">
                  No conversation logs yet. Send a note below to start the thread.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input box */}
        <div className="pt-6 w-full space-y-4">
          <form onSubmit={handleSendMessage} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="flex-1 px-4 py-2 text-sm border-0 focus:ring-0 focus:outline-none placeholder-slate-400 font-medium"
              placeholder="Type your message or inquiry here..."
              disabled={sending}
              required
            />
            <button
              type="submit"
              disabled={sending || !messageText.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition-all shadow-md shrink-0 disabled:opacity-50"
            >
              {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            </button>
          </form>

          {success && (
            <p className="text-xs text-green-600 font-bold flex items-center justify-center">
              <CheckCircle2 size={14} className="mr-1" /> {success}
            </p>
          )}

          {error && (
            <p className="text-xs text-red-600 font-bold flex items-center justify-center">
              <AlertCircle size={14} className="mr-1" /> {error}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
