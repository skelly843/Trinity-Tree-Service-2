import EditablePage from '@/components/blocks/EditablePage'
import { loadPageBlocks } from '@/utils/supabase/loadPageBlocks'
import { pageMetadata } from '@/utils/seo'
import BusinessJsonLd from '@/components/BusinessJsonLd'

// Served from cache; the site editor refreshes it on save and publish
export const revalidate = 3600

export function generateMetadata() {
  return pageMetadata('contact')
}

export default async function ContactPage() {
  const { blocks, persisted, data } = await loadPageBlocks('contact')
  return (
    <>
      <BusinessJsonLd />
      <EditablePage pageId="contact" initialBlocks={blocks} persisted={persisted} data={data} />
    </>
  )
}
