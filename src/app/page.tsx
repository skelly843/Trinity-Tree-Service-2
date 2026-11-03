import EditablePage from '@/components/blocks/EditablePage'
import { loadPageBlocks } from '@/utils/supabase/loadPageBlocks'

// Served from cache; the site editor refreshes it on save and publish
export const revalidate = 3600

export default async function HomePage() {
  const { blocks, persisted, data } = await loadPageBlocks('home')
  return <EditablePage pageId="home" initialBlocks={blocks} persisted={persisted} data={data} />
}
