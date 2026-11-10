import EditablePage from '@/components/blocks/EditablePage'
import { loadPageBlocks } from '@/utils/supabase/loadPageBlocks'
import { pageMetadata } from '@/utils/seo'
import BusinessJsonLd from '@/components/BusinessJsonLd'

// Served from cache; the site editor refreshes it on save and publish
export const revalidate = 3600

export function generateMetadata() {
  return pageMetadata('home')
}

export default async function HomePage() {
  const { blocks, persisted, data } = await loadPageBlocks('home')
  return (
    <>
      <BusinessJsonLd />
      <EditablePage pageId="home" initialBlocks={blocks} persisted={persisted} data={data} />
    </>
  )
}
