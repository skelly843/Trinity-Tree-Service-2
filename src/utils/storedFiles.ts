/**
 * Files in the private buckets (receipts, customer-files) have no public link.
 * Their database columns hold a reference like `storage://receipts/<folder>/<file>`,
 * and a short-lived signed link is made when someone opens the file.
 * Older rows may still hold a plain https link, which is used as is.
 */

const PREFIX = 'storage://'

export const PRIVATE_BUCKETS = ['receipts', 'customer-files'] as const

export function storedFileRef(bucket: string, path: string) {
  return `${PREFIX}${bucket}/${path}`
}

export function parseStoredFile(value?: string | null): { bucket: string; path: string } | null {
  if (!value || !value.startsWith(PREFIX)) return null
  const rest = value.slice(PREFIX.length)
  const slash = rest.indexOf('/')
  if (slash <= 0) return null
  return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) }
}

export function storedFileName(value?: string | null) {
  const parsed = parseStoredFile(value)
  const name = (parsed?.path || value || '').split('/').pop() || ''
  // Uploads are saved as <timestamp>-<random>-<original name>
  return name.replace(/^\d+-[a-z0-9]+-/, '')
}

/** A link that works for the signed-in user, valid for 10 minutes. */
export async function resolveStoredFileUrl(supabase: any, value?: string | null): Promise<string | null> {
  if (!value) return null
  const parsed = parseStoredFile(value)
  if (!parsed) return /^https?:\/\//i.test(value) ? value : null
  const { data, error } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 600)
  if (error) throw error
  return data?.signedUrl ?? null
}
