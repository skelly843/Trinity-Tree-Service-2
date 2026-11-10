import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { ASSISTANT_GUIDE, audienceFor } from '@/utils/assistantGuide'

export const maxDuration = 60

const DAILY_LIMIT = { customer: 30, employee: 80, office: 120 } as const
const MAX_TURNS = 12
const MAX_CHARS = 2000

/** The help assistant: answers how-to questions about this website for the signed-in user. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to use the assistant.' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, full_name, is_active').eq('id', user.id).maybeSingle()
  const audience = audienceFor(profile?.role)
  if (!profile || !audience || profile.is_active === false) {
    return NextResponse.json({ error: 'The assistant opens once your account is approved.' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const history: Anthropic.MessageParam[] = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, MAX_CHARS) }))
  if (!history.length || history[history.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Type a question first.' }, { status: 400 })
  }
  // The conversation must start with the user
  while (history.length && history[0].role !== 'user') history.shift()

  const { data: count, error: countError } = await supabase.rpc('count_assistant_question')
  if (countError) return NextResponse.json({ error: 'The assistant is not set up yet (database update 018 is missing).' }, { status: 503 })
  if (Number(count) > DAILY_LIMIT[audience]) {
    return NextResponse.json({ error: 'You\'ve reached today\'s question limit. Try again tomorrow, or contact the office.' }, { status: 429 })
  }

  const { data: company } = await supabase.from('company_settings').select('company_name, phone, email').eq('id', 'default').maybeSingle()
  const businessName = company?.company_name || 'the company'
  const phone = company?.phone || ''
  const page = typeof body.path === 'string' ? body.path.slice(0, 200) : ''

  const who =
    audience === 'customer'
      ? 'a customer using the customer portal'
      : audience === 'employee'
        ? 'an employee (field worker) using the employee area'
        : `office staff (${profile.role === 'global_admin' ? 'the owner' : 'an admin'}) using the admin area`

  const system = `You are the help assistant on ${businessName}'s website. You teach people how to use this website, step by step. You are talking with ${who}.

How this website works for them:
${ASSISTANT_GUIDE[audience]}

Rules:
- Answer only questions about using this website. Give short, numbered steps that name the exact buttons and menu items above. Two to six sentences or steps is usually right.
- Only describe features listed above. If you aren't sure a feature exists, say so instead of guessing.
- You can't see or change anyone's account, jobs, invoices or payments, and you don't know this person's data. Never make up dates, prices, amounts or statuses.
- ${
    audience === 'customer'
      ? `For anything you can't answer from the guide (prices, scheduling changes, billing questions, problems with their account, or anything about their specific job), tell them to call ${phone ? `the office at ${phone}` : 'the office'} or send a message under Messages.`
      : 'For business decisions, legal or tax questions, say to check with the owner or an accountant.'
  }
- Write plain text without markdown headings or tables. Be friendly and direct.`

  try {
    const client = new Anthropic()
    const message = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      // If a safety check declines the request, the API retries it on its recommended fallback model
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      // The guide is the same on every request, so it's cached
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [
        ...history.slice(0, -1),
        { role: 'user', content: `${page ? `(I'm on the page ${page}.) ` : ''}${history[history.length - 1].content}` }
      ]
    })

    if (message.stop_reason === 'refusal') {
      return NextResponse.json({ reply: `I can't help with that one.${phone && audience === 'customer' ? ` Please call the office at ${phone}.` : ''}` })
    }
    const reply = message.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim()
    return NextResponse.json({ reply: reply || 'Sorry, I could not come up with an answer. Please try rephrasing.' })
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'The assistant is not set up (the ANTHROPIC_API_KEY in Netlify is missing or invalid).' }, { status: 502 })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'The assistant is busy. Try again in a minute.' }, { status: 429 })
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `The assistant had a problem (${err.status}). Try again.` }, { status: 502 })
    }
    console.error('Assistant failed:', err)
    return NextResponse.json({ error: 'The assistant had a problem. Try again.' }, { status: 500 })
  }
}
