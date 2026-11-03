import EditablePage from '@/components/blocks/EditablePage'
import { loadPageBlocks } from '@/utils/supabase/loadPageBlocks'

// Served from cache; the site editor refreshes it on save and publish
export const revalidate = 3600

export default async function ContactPage() {
  const { blocks, persisted, data } = await loadPageBlocks('contact')
  return <EditablePage pageId="contact" initialBlocks={blocks} persisted={persisted} data={data} />
}
