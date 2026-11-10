import { cache } from 'react'
import type { Metadata } from 'next'
import { createPublicClient } from '@/utils/supabase/public'
import { loadSiteBrand } from '@/utils/supabase/loadSiteBrand'
import { loadPageBlocks } from '@/utils/supabase/loadPageBlocks'
import { EDITABLE_PAGES, type PageId } from '@/utils/pages'

/**
 * The site's main web address, used for canonical links, the sitemap and link previews.
 * Set NEXT_PUBLIC_SITE_URL (e.g. https://trinityproject.us) in Netlify; otherwise Netlify's
 * own URL variable (the site's primary domain) is used.
 */
export function siteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || ''
  if (!/^https?:\/\//i.test(raw)) return null
  return raw.trim().replace(/\/+$/, '')
}

export function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  const base = siteUrl()
  return base ? `${base}${path.startsWith('/') ? '' : '/'}${path}` : path
}

export interface CompanyDetails {
  company_name: string
  phone: string
  email: string
  address: string
  service_areas: string[]
  social_links: Record<string, string>
  /** Circle on the map: center and radius in miles */
  service_radius: { lat: number; lng: number; miles: number; label?: string } | null
  /** Regions served part of the year, such as storm response */
  seasonal_areas: string[]
}

/** Business details from Admin > Settings, read without cookies so pages stay cacheable. */
export const loadCompanyDetails = cache(async (): Promise<CompanyDetails | null> => {
  try {
    const supabase = createPublicClient()
    if (!supabase) return null
    const { data } = await supabase
      .from('company_settings')
      // All columns, so this keeps working on databases without the newer service area columns
      .select('*')
      .eq('id', 'default')
      .maybeSingle()
    if (!data) return null
    return {
      company_name: data.company_name || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      service_areas: Array.isArray(data.service_areas) ? data.service_areas.filter(Boolean) : [],
      social_links: data.social_links && typeof data.social_links === 'object' ? data.social_links : {},
      service_radius:
        data.service_radius && typeof data.service_radius.lat === 'number' && typeof data.service_radius.miles === 'number'
          ? data.service_radius
          : null,
      seasonal_areas: Array.isArray(data.seasonal_areas) ? data.seasonal_areas.filter(Boolean) : []
    }
  } catch {
    return null
  }
})

export const loadPublishedServices = cache(async () => {
  try {
    const supabase = createPublicClient()
    if (!supabase) return []
    const { data } = await supabase
      .from('services')
      .select('title, slug, short_description, featured_image, updated_at')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
    return data || []
  } catch {
    return []
  }
})

/** Trims to a search-result length on a word boundary. */
export function clip(text: string, max = 160) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

/** "Waco, Temple and Belton" */
export function areaList(areas: string[], max = 3) {
  const list = areas.slice(0, max)
  if (list.length <= 1) return list[0] || ''
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

/** Title, description, canonical link and link preview for one of the editable pages. */
export async function pageMetadata(pageId: PageId): Promise<Metadata> {
  const [brand, company, { blocks }] = await Promise.all([loadSiteBrand(), loadCompanyDetails(), loadPageBlocks(pageId)])
  const name = company?.company_name || brand.seo_title || brand.site_name
  const areas = areaList(company?.service_areas || [])
  const page = EDITABLE_PAGES[pageId]

  // The page's own banner text makes the best description, since the owner wrote it for that page
  const hero = blocks.find((b) => b.block_type === 'hero' && b.is_visible)
  const heroData = (hero?.published_data || {}) as Record<string, string>
  const heroText = [heroData.subtitle, heroData.title].find((t) => t && t.trim().length > 30) || ''
  const baseDescription = heroText || brand.seo_description || ''
  const description = clip(areas && !baseDescription.includes(areas.split(',')[0]) ? `${baseDescription} Serving ${areas}.` : baseDescription)

  const title =
    pageId === 'home'
      ? brand.seo_title && brand.seo_title !== name
        ? brand.seo_title
        : areas
          ? `${name} | ${areas}`
          : name
      : `${page.label} | ${name}`

  const image = heroData.backgroundImage || brand.logo_url
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: page.path },
    openGraph: {
      type: 'website',
      url: page.path,
      siteName: name,
      title,
      description,
      ...(image ? { images: [{ url: absoluteUrl(image) }] } : {})
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description }
  }
}

/** schema.org description of the business for Google, Bing and other search engines. */
export async function businessJsonLd() {
  const [brand, company, services] = await Promise.all([loadSiteBrand(), loadCompanyDetails(), loadPublishedServices()])
  const url = siteUrl()
  const name = company?.company_name || brand.seo_title || brand.site_name
  // Main cities, the map circle, and seasonal regions, in the shapes schema.org defines
  const areaServed: Record<string, unknown>[] = [
    ...(company?.service_areas || []).map((area) => ({ '@type': 'City', name: area })),
    ...(company?.service_radius
      ? [
          {
            '@type': 'GeoCircle',
            ...(company.service_radius.label ? { name: `Within ${Math.round(company.service_radius.miles)} miles of ${company.service_radius.label}` } : {}),
            geoMidpoint: { '@type': 'GeoCoordinates', latitude: company.service_radius.lat, longitude: company.service_radius.lng },
            geoRadius: Math.round(company.service_radius.miles * 1609.344)
          }
        ]
      : []),
    ...(company?.seasonal_areas || []).map((area) => ({ '@type': 'AdministrativeArea', name: area }))
  ]
  const sameAs = Object.values(company?.social_links || {}).filter((v) => typeof v === 'string' && /^https?:\/\//.test(v))

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name,
    ...(brand.site_name && brand.site_name !== name ? { alternateName: brand.site_name } : {}),
    ...(brand.seo_description ? { description: brand.seo_description } : {}),
    ...(url ? { url, '@id': `${url}/#business` } : {}),
    ...(company?.phone ? { telephone: company.phone } : {}),
    ...(company?.email ? { email: company.email } : {}),
    ...(brand.logo_url ? { logo: absoluteUrl(brand.logo_url), image: absoluteUrl(brand.logo_url) } : {}),
    ...(company?.address ? { address: { '@type': 'PostalAddress', streetAddress: company.address } } : {}),
    ...(areaServed.length ? { areaServed } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(services.length
      ? {
          makesOffer: services.map((s: any) => ({
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: s.title,
              ...(s.short_description ? { description: s.short_description } : {}),
              ...(url ? { url: `${url}/services/${s.slug}` } : {})
            }
          }))
        }
      : {})
  }
  // Escape "<" so text from the database can never close the script tag
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
