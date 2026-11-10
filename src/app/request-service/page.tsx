import EditablePage from '@/components/blocks/EditablePage'
import { loadPageBlocks } from '@/utils/supabase/loadPageBlocks'
import { pageMetadata } from '@/utils/seo'

// Served from cache; the site editor refreshes it on save and publish
export const revalidate = 3600

export function generateMetadata() {
  return pageMetadata('request-service')
}

export default async function RequestServicePage() {
  const { blocks, persisted, data } = await loadPageBlocks('request-service')
  return <EditablePage pageId="request-service" initialBlocks={blocks} persisted={persisted} data={data} />
}
