import type { MetadataRoute } from 'next'
import { EDITABLE_PAGES } from '@/utils/pages'
import { absoluteUrl, loadPublishedServices } from '@/utils/seo'

// Rebuilt hourly, so new services appear without a redeploy
export const revalidate = 3600

/** Every public page plus one entry per published service, for search engines to find. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const services = await loadPublishedServices()
  const pages: MetadataRoute.Sitemap = Object.values(EDITABLE_PAGES).map((page) => ({
    url: absoluteUrl(page.path),
    changeFrequency: page.path === '/' ? 'weekly' : 'monthly',
    priority: page.path === '/' ? 1 : page.path === '/services' ? 0.9 : 0.7
  }))
  return [
    ...pages,
    ...services.map((s: any) => ({
      url: absoluteUrl(`/services/${s.slug}`),
      ...(s.updated_at ? { lastModified: new Date(s.updated_at) } : {}),
      changeFrequency: 'monthly' as const,
      priority: 0.8
    }))
  ]
}
