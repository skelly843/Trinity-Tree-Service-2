import EditablePage from '@/components/blocks/EditablePage'
import { loadPageBlocks } from '@/utils/supabase/loadPageBlocks'
import { pageMetadata } from '@/utils/seo'

// Served from cache; the site editor refreshes it on save and publish
export const revalidate = 3600

export function generateMetadata() {
  return pageMetadata('gallery')
}

export default async function GalleryPage() {
  const { blocks, persisted, data } = await loadPageBlocks('gallery')
  return <EditablePage pageId="gallery" initialBlocks={blocks} persisted={persisted} data={data} />
}
