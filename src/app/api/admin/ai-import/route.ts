import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getProfile } from '@/utils/supabase/getProfile'
import { parseStoredFile } from '@/utils/storedFiles'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/utils/finance'

// Reading a multi-page statement can take a while; Netlify allows up to 60 seconds
export const maxDuration = 60

const MAX_BYTES = 20 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const

const CATEGORY_VALUES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => c.value)

// Structured output: Claude's reply must match this shape exactly
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['document_type', 'summary', 'transactions'],
  properties: {
    document_type: { type: 'string', enum: ['receipt', 'invoice', 'bank_statement', 'card_statement', 'other'] },
    summary: { type: 'string', description: 'One sentence describing the document, e.g. the store or bank and the period.' },
    transactions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['date', 'description', 'party', 'amount', 'direction', 'category', 'confidence'],
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD, or an empty string if no date is shown.' },
          description: { type: 'string' },
          party: { type: 'string', description: 'The store, vendor, customer or payer.' },
          amount: { type: 'number', description: 'Always positive, in dollars.' },
          direction: { type: 'string', enum: ['expense', 'income', 'transfer'] },
          category: { type: 'string', enum: CATEGORY_VALUES },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] }
        }
      }
    }
  }
} as const

const SYSTEM = `You turn a small business's receipts, invoices and bank or card statements into bookkeeping entries.

Rules:
- A receipt or vendor invoice is one expense: use the final total paid, not each line item. Use the line items to choose the category and description.
- A bank or card statement becomes one entry per transaction line. Skip opening and closing balances, running balances and totals.
- Money leaving the business is "expense"; money received (deposits, customer payments, refunds) is "income". Transfers between the business's own accounts and credit card payments are "transfer", so they are not counted twice.
- Amounts are always positive numbers.
- Pick the closest category. Expense categories: ${EXPENSE_CATEGORIES.map((c) => `${c.value} (${c.label})`).join('; ')}. Income categories: ${INCOME_CATEGORIES.map((c) => `${c.value} (${c.label})`).join('; ')}.
- Copy dates exactly as YYYY-MM-DD. If the year is not printed, use the statement period or the most likely recent year.
- Set confidence to "low" when text is hard to read or you had to guess, so a person checks it.
- Never invent transactions that are not on the document.`

export async function POST(request: Request) {
  const profile = await getProfile()
  if (!profile || profile.role !== 'global_admin' || !profile.is_active) {
    return NextResponse.json({ error: 'Only an active global admin can use the import.' }, { status: 403 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'The AI import is not set up. Add an ANTHROPIC_API_KEY environment variable in Netlify and redeploy.' },
      { status: 503 }
    )
  }

  const { fileRef } = await request.json().catch(() => ({}))
  const stored = parseStoredFile(fileRef)
  if (!stored || stored.bucket !== 'receipts') {
    return NextResponse.json({ error: 'Upload the file first.' }, { status: 400 })
  }

  // Downloaded with the admin's own session, so storage access rules still apply
  const supabase = await createClient()
  const { data: blob, error: downloadError } = await supabase.storage.from(stored.bucket).download(stored.path)
  if (downloadError || !blob) {
    return NextResponse.json({ error: downloadError?.message || 'Could not read the uploaded file.' }, { status: 400 })
  }
  if (blob.size > MAX_BYTES) {
    return NextResponse.json({ error: 'The file is larger than 20 MB. Split the statement into smaller files.' }, { status: 413 })
  }

  const extension = stored.path.split('.').pop()?.toLowerCase()
  const mediaType = blob.type && blob.type !== 'application/octet-stream'
    ? blob.type
    : extension === 'pdf' ? 'application/pdf' : extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg'
  const data = Buffer.from(await blob.arrayBuffer()).toString('base64')

  let fileBlock: Anthropic.Beta.BetaContentBlockParam
  if (mediaType === 'application/pdf') {
    fileBlock = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
  } else if ((IMAGE_TYPES as readonly string[]).includes(mediaType)) {
    fileBlock = { type: 'image', source: { type: 'base64', media_type: mediaType as (typeof IMAGE_TYPES)[number], data } }
  } else {
    return NextResponse.json({ error: 'Upload a photo (JPG, PNG, WEBP) or a PDF.' }, { status: 415 })
  }

  try {
    const client = new Anthropic()
    const stream = client.beta.messages.stream({
      model: 'claude-opus-5-5',
      max_tokens: 32000,
      // If a safety check declines the request, the API retries it on its recommended fallback model
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA as any } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [fileBlock, { type: 'text', text: `Today is ${new Date().toISOString().slice(0, 10)}. Extract the entries from this document.` }]
        }
      ]
    })
    const message = await stream.finalMessage()

    if (message.stop_reason === 'refusal') {
      return NextResponse.json({ error: 'The document could not be read. Try a clearer photo or enter it by hand.' }, { status: 422 })
    }
    if (message.stop_reason === 'max_tokens') {
      return NextResponse.json({ error: 'The document has too many lines to read at once. Split it into smaller files.' }, { status: 422 })
    }

    const text = message.content.map((block) => (block.type === 'text' ? block.text : '')).join('')
    return NextResponse.json(JSON.parse(text))
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'The ANTHROPIC_API_KEY in Netlify is not valid.' }, { status: 502 })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'The AI service is busy. Try again in a minute.' }, { status: 429 })
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `The AI service returned an error (${err.status}). Try again.` }, { status: 502 })
    }
    console.error('AI import failed:', err)
    return NextResponse.json({ error: 'Reading the document failed. Try again.' }, { status: 500 })
  }
}
