import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Phone } from 'lucide-react'
import ServiceAreaMap from '@/components/ServiceAreaMapLazy'
import { absoluteUrl, clip, loadCompanyDetails, loadPublishedServices, serviceAreaList, siteUrl } from '@/utils/seo'
import { loadSiteBrand } from '@/utils/supabase/loadSiteBrand'

// Served from cache; Business Settings refreshes it on save
export const revalidate = 3600

async function findArea(slug: string) {
  const company = await loadCompanyDetails()
  const area = serviceAreaList(company).find((a) => a.slug === slug && a.hasPage)
  return { company, area }
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params
  const [{ company, area }, brand] = await Promise.all([findArea(city), loadSiteBrand()])
  if (!area) return { robots: { index: false } }
  const name = company?.company_name || brand.site_name
  const title = `${name} in ${area.city}`
  const description = clip(area.text)
  const path = `/service-areas/${area.slug}`
  return { title: { absolute: title }, description, alternates: { canonical: path }, openGraph: { title, description, url: path } }
}

/** A city page, published only when the owner has written about the business's work there. */
export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params
  const [{ company, area }, brand, services] = await Promise.all([findArea(city), loadSiteBrand(), loadPublishedServices()])
  if (!area) notFound()

  const name = company?.company_name || brand.site_name
  const phone = company?.phone || ''
  const url = siteUrl()
  // The business, described as serving this city, for search engines
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name,
    ...(url ? { url, '@id': `${url}/#business` } : {}),
    ...(phone ? { telephone: phone } : {}),
    ...(brand.logo_url ? { image: absoluteUrl(brand.logo_url) } : {}),
    areaServed: { '@type': 'City', name: area.city },
    ...(services.length ? { makesOffer: services.map((s: any) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.title } })) } : {})
  }).replace(/</g, '\\u003c')

  return (
    <main className="bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <section className="max-w-4xl mx-auto px-6 py-14 space-y-8">
        <Link href="/service-areas" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-800">
          <ArrowLeft size={16} /> All service areas
        </Link>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
          {name} in {area.city}
        </h1>
        <div className="space-y-4 text-lg text-slate-700 leading-relaxed">
          {area.text.split(/\n{2,}|\n/).filter(Boolean).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        {services.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">Our services in {area.city}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {services.map((s: any) => (
                <li key={s.slug}>
                  <Link href={`/services/${s.slug}`} className="block p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300">
                    <span className="block font-bold text-slate-900">{s.title}</span>
                    {s.short_description && <span className="block text-sm text-slate-500 mt-1">{s.short_description}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {company?.service_radius && <ServiceAreaMap area={company.service_radius} />}

        <div className="p-6 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-lg font-bold">Need work done in {area.city}?</p>
          <div className="flex flex-wrap gap-3">
            {phone && (
              <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-slate-900 font-bold">
                <Phone size={18} /> {phone}
              </a>
            )}
            <Link href="/request-service" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 font-bold">
              Request Service
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
