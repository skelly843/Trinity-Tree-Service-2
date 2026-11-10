import type { MetadataRoute } from 'next'
import { siteUrl } from '@/utils/seo'

/** Lets search engines crawl the public site, but not the admin, portal or sign-in pages. */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/portal', '/employee', '/dashboard', '/api/', '/auth/', '/login', '/signup', '/forgot-password', '/reset-password']
    },
    ...(base ? { sitemap: `${base}/sitemap.xml`, host: base } : {})
  }
}
