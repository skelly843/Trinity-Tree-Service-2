'use client'

import { useEffect, useRef, useState } from 'react'
import { ClipboardCheck, ExternalLink, FileText, Loader2, Paperclip, Send, Sparkles, X } from 'lucide-react'

interface Attached {
  name: string
  type: string
  data: string
  preview?: string
}
interface Line {
  description: string
  quantity: number
  unit_price: number
}
interface Turn {
  role: 'user' | 'assistant'
  text: string
  files?: Attached[]
  proposal?: { lines: Line[]; terms: string } | null
  sources?: { url: string; title: string }[]
}
export interface EstimateDraft {
  customerName: string
  items: { description: string; quantity: string; unitPrice: string }[]
  terms: string
}

const MAX_FILES = 5
const MAX_BYTES = 3 * 1024 * 1024 // per PDF
const MAX_TOTAL = 4 * 1024 * 1024 // all files in one conversation, to stay under the server upload limit
const STARTERS = [
  'Help me price removing a large oak near a house. Photos attached.',
  'Is this estimate fair, and how can I make it more appealing?',
  'What do stump grinding and haul-off usually cost around here?'
]
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

/** Shrinks a photo to the size the AI reads (about 1,600 pixels on the long side). */
async function photoForAi(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1568 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob ? new File([blob], file.name.replace(/.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }) : file
  } catch {
    return file
  }
}

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Estimating assistant for office staff: reads attached photos and PDFs, checks the
 * business's past prices and current market ranges, and drafts line items that can be
 * put straight into the estimate form. Nothing is saved or sent without the owner.
 */
export function EstimateHelper({
  open,
  onClose,
  draft,
  onUseProposal
}: {
  open: boolean
  onClose: () => void
  draft: EstimateDraft | null
  onUseProposal: (lines: Line[], terms: string) => void
}) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [text, setText] = useState('')
  const [files, setFiles] = useState<Attached[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [turns, busy])

  const filesUsed = turns.reduce((n, t) => n + (t.files?.length || 0), 0) + files.length

  async function addFiles(list: FileList | null) {
    if (!list) return
    setError(null)
    const next: Attached[] = []
    for (const original of Array.from(list)) {
      if (filesUsed + next.length >= MAX_FILES) {
        setError(`Up to ${MAX_FILES} files per conversation. Press Start over to add more.`)
        break
      }
      if (!original.type.startsWith('image/') && original.type !== 'application/pdf') {
        setError(`${original.name} isn't a photo or PDF.`)
        continue
      }
      // Photos are shrunk first, which keeps uploads quick and the AI cost low
      const file = original.type.startsWith('image/') ? await photoForAi(original) : original
      if (!file.type.startsWith('image/') && file.size > MAX_BYTES) {
        setError(`${original.name} is over 3 MB.`)
        continue
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'].includes(file.type)) {
        setError(`${original.name} couldn't be read. Try a JPG or PNG photo.`)
        continue
      }
      const used = [...turns.flatMap((t) => t.files || []), ...files, ...next].reduce((n, f) => n + f.data.length * 0.75, 0)
      if (used + file.size > MAX_TOTAL) {
        setError('That would be too much to send at once. Start over, or use fewer or smaller files.')
        break
      }
      const type = file.type
      next.push({ name: original.name, type, data: await readBase64(file), preview: type.startsWith('image/') ? URL.createObjectURL(file) : undefined })
    }
    setFiles((prev) => [...prev, ...next])
    if (fileInput.current) fileInput.current.value = ''
  }

  async function send(message: string, attachDraft = false) {
    let body = message.trim()
    if (attachDraft && draft) {
      const lines = draft.items
        .filter((i) => i.description.trim())
        .map((i) => `- ${i.description} | qty ${i.quantity || 1} | $${i.unitPrice || 0} each`)
        .join('\n')
      body = `${body || 'Review this estimate: is it priced fairly, and how can I make it more appealing to the customer?'}\n\nCustomer: ${draft.customerName || '(not chosen yet)'}\nLines:\n${lines || '(no lines yet)'}\nTerms: ${draft.terms || '(none)'}`
    }
    if (!body && !files.length) return
    const userTurn: Turn = { role: 'user', text: body || 'Please look at the attached file.', files }
    const history = [...turns, userTurn]
    setTurns(history)
    setText('')
    setFiles([])
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/estimate-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map((t) => ({ role: t.role, text: t.text, files: t.files?.map(({ name, type, data }) => ({ name, type, data })) }))
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setTurns(history.slice(0, -1))
        setFiles(userTurn.files || [])
        setText(message)
        setError(data.error || (res.status === 504 ? 'That took too long. Try fewer or smaller files.' : 'Something went wrong. Try again.'))
        return
      }
      setTurns([...history, { role: 'assistant', text: data.reply, proposal: data.proposal, sources: data.sources }])
    } catch {
      setTurns(history.slice(0, -1))
      setFiles(userTurn.files || [])
      setError('Could not reach the estimate helper. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <aside
      aria-label="Estimate helper"
      className="fixed inset-y-0 right-0 z-[60] w-full sm:w-[27rem] bg-white border-l border-slate-200 shadow-2xl flex flex-col"
    >
      <header className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-2">
        <span className="font-bold flex items-center gap-2">
          <Sparkles size={18} /> Estimate helper
        </span>
        <span className="flex items-center gap-1">
          {turns.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setTurns([])
                setFiles([])
                setError(null)
              }}
              className="px-2 py-1 rounded text-xs font-semibold hover:bg-white/10"
            >
              Start over
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-white/10">
            <X size={18} />
          </button>
        </span>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {turns.length === 0 && (
          <div className="space-y-3 text-slate-600">
            <p>
              Attach job photos, a competitor&apos;s quote or a supplier price list, and ask for help pricing the work, checking that an estimate is fair, or making it more
              appealing. I can check your past prices and current prices in your area, and draft line items you can put straight into the estimate.
            </p>
            {draft && (
              <button
                type="button"
                onClick={() => send('', true)}
                disabled={busy}
                className="w-full text-left px-3 py-2 rounded-xl bg-green-50 text-green-800 font-semibold hover:bg-green-100 flex items-center gap-2"
              >
                <ClipboardCheck size={16} /> Review the estimate I have open
              </button>
            )}
            {STARTERS.map((q) => (
              <button key={q} type="button" onClick={() => setText(q)} className="w-full text-left px-3 py-2 rounded-xl bg-blue-50 text-blue-800 font-semibold hover:bg-blue-100">
                {q}
              </button>
            ))}
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'} gap-2`}>
            {t.files && t.files.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-end">
                {t.files.map((f, j) =>
                  f.preview ? (
                    <img key={j} src={f.preview} alt={f.name} className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                  ) : (
                    <span key={j} className="px-2 py-1 rounded-lg bg-slate-100 text-xs flex items-center gap-1">
                      <FileText size={12} /> {f.name}
                    </span>
                  )
                )}
              </div>
            )}
            <p className={`max-w-[90%] px-3 py-2 rounded-2xl whitespace-pre-wrap ${t.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>{t.text}</p>

            {t.proposal && (
              <div className="w-full rounded-xl border border-green-200 bg-green-50 p-3 space-y-2">
                <p className="font-bold text-green-900">Draft estimate</p>
                <ul className="space-y-1">
                  {t.proposal.lines.map((l, j) => (
                    <li key={j} className="flex justify-between gap-3 text-slate-800">
                      <span className="min-w-0">
                        {l.description}
                        {l.quantity !== 1 ? ` × ${l.quantity}` : ''}
                      </span>
                      <span className="font-semibold shrink-0">{money(l.quantity * l.unit_price)}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-right font-extrabold text-slate-900">
                  Total {money(t.proposal.lines.reduce((s, l) => s + Math.round(l.quantity * l.unit_price * 100) / 100, 0))}
                </p>
                {t.proposal.terms && <p className="text-xs text-slate-600">Terms: {t.proposal.terms}</p>}
                <button
                  type="button"
                  onClick={() => onUseProposal(t.proposal!.lines, t.proposal!.terms)}
                  className="w-full px-3 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700"
                >
                  {draft ? 'Replace the lines in my open estimate' : 'Start a new estimate with these lines'}
                </button>
                <p className="text-[11px] text-slate-500">Check every price before sending. Nothing is saved until you press Save or Send.</p>
              </div>
            )}

            {t.sources && t.sources.length > 0 && (
              <div className="text-xs text-slate-500 space-y-0.5">
                <p className="font-semibold">Sources</p>
                {t.sources.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-700 hover:underline truncate">
                    <ExternalLink size={11} className="shrink-0" /> <span className="truncate">{s.title}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}

        {busy && (
          <p className="flex items-center gap-2 text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Looking at it… this can take up to a minute.
          </p>
        )}
      </div>

      <div className="border-t border-slate-100 p-3 space-y-2">
        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {files.map((f, i) => (
              <span key={i} className="px-2 py-1 rounded-lg bg-slate-100 text-xs flex items-center gap-1">
                <FileText size={12} /> <span className="max-w-[9rem] truncate">{f.name}</span>
                <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(text)
          }}
          className="flex gap-2 items-end"
        >
          <input ref={fileInput} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => addFiles(e.target.files)} />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy || filesUsed >= MAX_FILES}
            aria-label="Attach photos or PDFs"
            title="Attach photos or PDFs"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <Paperclip size={16} />
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(text)
              }
            }}
            rows={2}
            maxLength={3000}
            placeholder="Ask about pricing, fairness or wording..."
            aria-label="Your question"
            className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={busy || (!text.trim() && !files.length)} aria-label="Send" className="p-2.5 rounded-xl bg-blue-600 text-white disabled:opacity-50">
            <Send size={16} />
          </button>
        </form>
        {draft && turns.length > 0 && (
          <button type="button" onClick={() => send('', true)} disabled={busy} className="text-xs font-semibold text-green-700 hover:underline">
            Review the estimate I have open
          </button>
        )}
        <p className="text-[11px] text-slate-400">AI suggestions can be wrong; you set the final price. Files are only used for this conversation and are not saved.</p>
      </div>
    </aside>
  )
}
