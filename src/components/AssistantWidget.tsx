'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { BellOff, GraduationCap, Lightbulb, Loader2, Power, Send, X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { ASSISTANT_STARTERS, ASSISTANT_TIPS, audienceFor, type AssistantAudience } from '@/utils/assistantGuide'

interface Chat {
  role: 'user' | 'assistant'
  content: string
}

const TIP_EVERY_MS = 4 * 60 * 60 * 1000 // a tip at most every 4 hours
const FIRST_WEEK_MS = 7 * 24 * 60 * 60 * 1000

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private browsing: tips just show again next time */
  }
}

/**
 * Help assistant for signed-in customers, employees and office staff: answers how-to
 * questions and shows a short tip now and then. Customers can silence or turn it off any
 * time; staff can after their first week.
 */
export default function AssistantWidget() {
  const pathname = usePathname() || '/'
  const [userId, setUserId] = useState<string | null>(null)
  const [audience, setAudience] = useState<AssistantAudience | null>(null)
  const [firstWeekUntil, setFirstWeekUntil] = useState<number>(0)
  const [enabled, setEnabled] = useState(true)
  const [tipsOn, setTipsOn] = useState(true)
  const [open, setOpen] = useState(false)
  const [tip, setTip] = useState<string | null>(null)
  const [chat, setChat] = useState<Chat[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Keep the conversation while moving between pages in this tab
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('assistant-chat')
      if (saved) setChat(JSON.parse(saved))
    } catch {
      /* nothing saved */
    }
  }, [])
  useEffect(() => {
    try {
      sessionStorage.setItem('assistant-chat', JSON.stringify(chat.slice(-20)))
    } catch {
      /* storage blocked */
    }
  }, [chat])

  const load = useCallback(async () => {
    try {
      const supabase = createClient()
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) {
        setAudience(null)
        setChat([])
        return
      }
      const { data: profile } = await supabase.from('profiles').select('role, is_active, created_at').eq('id', user.id).maybeSingle()
      const kind = profile?.is_active === false ? null : audienceFor(profile?.role)
      setUserId(user.id)
      setAudience(kind)
      setFirstWeekUntil(profile?.created_at && kind !== 'customer' ? new Date(profile.created_at).getTime() + FIRST_WEEK_MS : 0)
      const { data: settings } = await supabase.from('assistant_settings').select('tips_enabled, assistant_enabled').eq('user_id', user.id).maybeSingle()
      setEnabled(settings?.assistant_enabled ?? true)
      setTipsOn(settings?.tips_enabled ?? true)
    } catch {
      setAudience(null)
    }
  }, [])

  useEffect(() => {
    load()
    let sub: { unsubscribe: () => void } | undefined
    try {
      sub = createClient().auth.onAuthStateChange(() => load()).data.subscription
    } catch {
      /* no database configured */
    }
    return () => sub?.unsubscribe()
  }, [load])

  // A tip now and then, on a different page each time
  useEffect(() => {
    if (!audience || !enabled || !tipsOn || open || !userId) return
    const key = `assistant-tip-${userId}`
    const last = Number(read(`${key}-at`) || 0)
    if (Date.now() - last < TIP_EVERY_MS) return
    const tips = ASSISTANT_TIPS[audience]
    const index = (Number(read(`${key}-n`) || 0) + 1) % tips.length
    const timer = setTimeout(() => {
      setTip(tips[index])
      write(`${key}-at`, String(Date.now()))
      write(`${key}-n`, String(index))
    }, 2500)
    return () => clearTimeout(timer)
  }, [audience, enabled, tipsOn, open, userId, pathname])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [chat, sending])

  async function saveSettings(next: { tips_enabled: boolean; assistant_enabled: boolean }) {
    if (!userId) return
    const { error } = await createClient()
      .from('assistant_settings')
      .upsert({ user_id: userId, ...next }, { onConflict: 'user_id' })
    if (error) {
      setNotice(error.message.replace(/^.*?(The assistant stays on)/, '$1'))
      return false
    }
    setTipsOn(next.tips_enabled)
    setEnabled(next.assistant_enabled)
    setNotice(null)
    return true
  }

  async function ask(question: string) {
    const text = question.trim()
    if (!text || sending) return
    const next: Chat[] = [...chat, { role: 'user', content: text }]
    setChat(next)
    setDraft('')
    setSending(true)
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, path: pathname })
      })
      const data = await res.json().catch(() => ({}))
      setChat([...next, { role: 'assistant', content: data.reply || data.error || 'Something went wrong. Try again.' }])
    } catch {
      setChat([...next, { role: 'assistant', content: 'I could not reach the assistant. Check your connection and try again.' }])
    } finally {
      setSending(false)
    }
  }

  if (!audience) return null

  // On public pages the owner's Edit button sits bottom-right, so Help moves up above it
  const raised = audience === 'office' && !['/admin', '/employee', '/portal'].some((p) => pathname.startsWith(p))
  const inFirstWeek = firstWeekUntil > Date.now()
  const canTurnOff = audience === 'customer' || !inFirstWeek
  const firstWeekDate = new Date(firstWeekUntil).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  // Turned off: a small faded button to turn it back on
  if (!enabled) {
    return (
      <button
        type="button"
        onClick={() => saveSettings({ tips_enabled: tipsOn, assistant_enabled: true })}
        title="Turn the help assistant back on"
        aria-label="Turn the help assistant back on"
        className={`fixed ${raised ? 'bottom-24' : 'bottom-4'} right-4 z-40 w-9 h-9 rounded-full bg-white/80 border border-slate-200 text-slate-400 hover:text-blue-600 shadow-sm flex items-center justify-center`}
      >
        <GraduationCap size={16} />
      </button>
    )
  }

  return (
    <div className={`fixed ${raised ? 'bottom-24' : 'bottom-4'} right-4 z-40 flex flex-col items-end gap-3 max-w-[calc(100vw-2rem)]`}>
      {tip && !open && (
        <div role="status" className="w-80 max-w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-4 space-y-3">
          <p className="text-sm text-slate-700 flex gap-2">
            <Lightbulb size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <span>{tip}</span>
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <button type="button" onClick={() => setTip(null)} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white">
              Got it
            </button>
            <button
              type="button"
              onClick={() => {
                setTip(null)
                setOpen(true)
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700"
            >
              Ask a question
            </button>
            {canTurnOff && (
              <button
                type="button"
                onClick={async () => {
                  if (await saveSettings({ tips_enabled: false, assistant_enabled: true })) setTip(null)
                  else setOpen(true)
                }}
                className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                Stop tips
              </button>
            )}
          </div>
        </div>
      )}

      {open && (
        <section
          aria-label="Help assistant"
          className="w-[22rem] max-w-full h-[min(32rem,calc(100vh-7rem))] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          <header className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-2">
            <span className="font-bold flex items-center gap-2">
              <GraduationCap size={18} /> Help assistant
            </span>
            <span className="flex items-center gap-1">
              {chat.length > 0 && (
                <button type="button" onClick={() => setChat([])} className="px-2 py-1 rounded text-xs font-semibold hover:bg-white/10">
                  Start over
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-1 rounded hover:bg-white/10">
                <X size={18} />
              </button>
            </span>
          </header>

          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
            {chat.length === 0 && (
              <div className="space-y-3">
                <p className="text-slate-600">Ask me how to do anything on this website, or about your own visits, bills and jobs. Try:</p>
                <div className="flex flex-col gap-2">
                  {ASSISTANT_STARTERS[audience].map((q) => (
                    <button key={q} type="button" onClick={() => ask(q)} className="text-left px-3 py-2 rounded-xl bg-blue-50 text-blue-800 font-semibold hover:bg-blue-100">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chat.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-[85%] px-3 py-2 rounded-2xl whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  {m.content}
                </p>
              </div>
            ))}
            {sending && (
              <p className="flex items-center gap-2 text-slate-500">
                <Loader2 size={16} className="animate-spin" /> Thinking...
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              ask(draft)
            }}
            className="p-3 border-t border-slate-100 flex gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
              placeholder="Type your question..."
              aria-label="Your question"
              className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" disabled={sending || !draft.trim()} aria-label="Send" className="px-3 rounded-xl bg-blue-600 text-white disabled:opacity-50">
              <Send size={16} />
            </button>
          </form>

          <footer className="px-3 pb-3 space-y-1">
            <p className="text-[11px] text-slate-400">Answers come from AI and can be wrong. Check important details on the page itself.</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
              {canTurnOff && (
                <button
                  type="button"
                  onClick={() => saveSettings({ tips_enabled: !tipsOn, assistant_enabled: true })}
                  className="inline-flex items-center gap-1 hover:text-slate-800"
                >
                  <BellOff size={13} /> {tipsOn ? 'Stop tips' : 'Show tips again'}
                </button>
              )}
              {canTurnOff ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (await saveSettings({ tips_enabled: false, assistant_enabled: false })) setOpen(false)
                  }}
                  className="inline-flex items-center gap-1 hover:text-slate-800"
                >
                  <Power size={13} /> Turn off assistant
                </button>
              ) : (
                <span className="text-slate-400">The assistant and tips stay on until {firstWeekDate} while you learn the site.</span>
              )}
            </div>
            {notice && <p className="text-xs text-red-600">{notice}</p>}
          </footer>
        </section>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true)
            setTip(null)
          }}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-blue-600 text-white font-bold shadow-lg hover:bg-blue-700"
        >
          <GraduationCap size={18} /> Help
        </button>
      )}
    </div>
  )
}
