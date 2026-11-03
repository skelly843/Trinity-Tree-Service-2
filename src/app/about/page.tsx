import EditablePage from '@/components/blocks/EditablePage'
import { loadPageBlocks } from '@/utils/supabase/loadPageBlocks'

// Served from cache; the site editor refreshes it on save and publish
export const revalidate = 3600

export default async function AboutPage() {
  const { blocks, persisted, data } = await loadPageBlocks('about')
  return <EditablePage pageId="about" initialBlocks={blocks} persisted={persisted} data={data} />
}
