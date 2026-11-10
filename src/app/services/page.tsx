import EditablePage from '@/components/blocks/EditablePage'
import { loadPageBlocks } from '@/utils/supabase/loadPageBlocks'
import { pageMetadata } from '@/utils/seo'

// Served from cache; the site editor refreshes it on save and publish
export const revalidate = 3600

export function generateMetadata() {
  return pageMetadata('services')
}

export default async function ServicesPage() {
  const { blocks, persisted, data } = await loadPageBlocks('services')
  return <EditablePage pageId="services" initialBlocks={blocks} persisted={persisted} data={data} />
}
