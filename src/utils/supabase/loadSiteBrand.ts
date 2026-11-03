import { cache } from 'react'
import { createPublicClient } from '@/utils/supabase/public'
import { normalizeBrand, type SiteBrand } from '@/utils/siteTheme'

/** Server-side load of the site brand; shared by generateMetadata and the root layout in one request. */
export const loadSiteBrand = cache(async (): Promise<SiteBrand> => {
  try {
    const supabase = createPublicClient()
    if (supabase) {
      const { data, error } = await supabase.from('global_styles').select('*').eq('id', 'default').maybeSingle()
      if (error) console.warn('global_styles load failed:', error.message)
      else return normalizeBrand(data)
    }
  } catch (err: any) {
    console.warn('global_styles load failed:', err?.message)
  }
  return normalizeBrand(null)
})
