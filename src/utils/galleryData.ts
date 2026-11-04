import type { SupabaseClient } from '@supabase/supabase-js'

export interface PublicGalleryFilter {
  id: string
  name: string
}

/** Published, public gallery projects, each with `filter_ids`. Shared by the server page load and the browser refresh. */
export async function fetchPublicGallery(supabase: SupabaseClient): Promise<{ items: any[]; error?: string }> {
  const query = (columns: string) =>
    supabase
      .from('gallery_items')
      .select(columns)
      .eq('is_published', true)
      .eq('is_private', false)
      .order('sort_order', { ascending: true })

  const tagged = await query('*, gallery_item_filters(filter_id)')
  if (!tagged.error) {
    return {
      items: (tagged.data || []).map(({ gallery_item_filters, ...item }: any) => ({
        ...item,
        filter_ids: (gallery_item_filters || []).map((link: any) => link.filter_id)
      }))
    }
  }

  // A database without migration 012 has no filter tables yet; show the gallery without filters
  const plain = await query('*')
  if (plain.error) return { items: [], error: plain.error.message }
  return { items: (plain.data || []).map((item: any) => ({ ...item, filter_ids: [] })) }
}

/** The gallery filters in display order, or none if the database has no filter tables yet. */
export async function fetchGalleryFilters(supabase: SupabaseClient): Promise<PublicGalleryFilter[]> {
  const { data, error } = await supabase
    .from('gallery_filters')
    .select('id, name')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  return error ? [] : data || []
}
