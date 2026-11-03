import { createPublicClient } from '@/utils/supabase/public'
import { getDefaultBlocks, type PageId } from '@/utils/pages'
import { FALLBACK_GALLERY_ITEMS, FALLBACK_SERVICES } from '@/utils/fallbackData'
import type { PageBlock } from '@/components/blocks/types'
import type { PageData } from '@/components/blocks/PageData'

type PublicClient = NonNullable<ReturnType<typeof createPublicClient>>

/**
 * Server-side load of a page's sections. Falls back to the built-in defaults when
 * the page has no rows yet (or page_blocks is unavailable), so visitors never see a blank page.
 * `persisted` tells the editor whether the blocks already exist in the database.
 * `data` holds the services and gallery items the page's blocks list, so they render without a layout shift.
 * Uses the cookie-free client so the page can be cached; the editor refreshes the cache on save.
 */
export async function loadPageBlocks(
  pageId: PageId
): Promise<{ blocks: PageBlock[]; persisted: boolean; data: PageData }> {
  const supabase = createPublicClient()
  let blocks = getDefaultBlocks(pageId)
  let persisted = false

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('page_blocks')
        .select('id, page_id, block_type, display_order, is_visible, draft_data, published_data')
        .eq('page_id', pageId)
        .order('display_order', { ascending: true })

      if (error) {
        console.warn(`page_blocks load failed for "${pageId}":`, error.message)
      } else if (Array.isArray(data) && data.length > 0) {
        blocks = data as PageBlock[]
        persisted = true
      }
    }
  } catch (err: any) {
    console.warn(`page_blocks load failed for "${pageId}":`, err?.message)
  }

  const types = new Set(blocks.map((b) => b.block_type))
  const [services, gallery] = await Promise.all([
    types.has('services_grid') ? loadServices(supabase) : undefined,
    types.has('gallery_grid') ? loadGallery(supabase) : undefined
  ])
  return { blocks, persisted, data: { services, gallery } }
}

async function loadServices(supabase: PublicClient | null) {
  if (!supabase) return FALLBACK_SERVICES
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
  if (error) {
    console.warn('services load failed:', error.message)
    return FALLBACK_SERVICES
  }
  return data || []
}

async function loadGallery(supabase: PublicClient | null) {
  if (!supabase) return FALLBACK_GALLERY_ITEMS
  const { data, error } = await supabase
    .from('gallery_items')
    .select('*')
    .eq('is_published', true)
    .eq('is_private', false)
    .order('sort_order', { ascending: true })
  if (error) {
    console.warn('gallery load failed:', error.message)
    return FALLBACK_GALLERY_ITEMS
  }
  return data || []
}
