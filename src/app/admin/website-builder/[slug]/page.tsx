import { redirect } from 'next/navigation'

// The old form editors were replaced by editing on the page itself
export default async function OldPageEditor({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return redirect(slug === 'home' ? '/?edit=1' : `/${slug}?edit=1`)
}
