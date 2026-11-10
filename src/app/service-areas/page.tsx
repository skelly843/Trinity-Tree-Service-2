import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, MapPin, Phone } from 'lucide-react'
import ServiceAreaMap from '@/components/ServiceAreaMapLazy'
import BusinessJsonLd from '@/components/BusinessJsonLd'
import { areaList, clip, loadCompanyDetails, loadPublishedServices, serviceAreaList } from '@/utils/seo'
import { loadSiteBrand } from '@/utils/supabase/loadSiteBrand'

// Served from cache; Business Settings refreshes it on save
export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const [company, brand] = await Promise.all([loadCompanyDetails(), loadSiteBrand()])
  const name = company?.company_name || brand.site_name
  const cities = areaList(company?.service_areas || [], 4)
  const title = `Service Areas | ${name}`
  const description = clip(`${name} serves ${cities || 'the area'}${company?.seasonal_areas?.length ? `, with storm response in ${company.seasonal_areas.join(', ')}` : ''}. See every city we cover.`)
  return { title: { absolute: title }, description, alternates: { canonical: '/service-areas' }, openGraph: { title, description, url: '/service-areas' } }
}

/** Every city the business serves, the map, and links to the cities with their own pages. */
export default async function ServiceAreasPage() {
  const [company, brand, services] = await Promise.all([loadCompanyDetails(), loadSiteBrand(), loadPublishedServices()])
  const name = company?.company_name || brand.site_name
  const areas = serviceAreaList(company)
  const phone = company?.phone || ''

  return (
    <main className="bg-slate-50">
      <BusinessJsonLd />
      <section className="max-w-5xl mx-auto px-6 py-14 space-y-10">
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">Areas We Serve</h1>
          <p className="text-slate-600 text-lg max-w-3xl">
            {name} works across {areaList(company?.service_areas || [], 4) || 'the region'}
            {company?.service_radius ? `, within about ${Math.round(company.service_radius.miles)} miles of ${company.service_radius.label || 'our base'}` : ''}.
            {company?.seasonal_areas?.length ? ` During storm season we also respond in ${company.seasonal_areas.join(', ')}.` : ''}
          </p>
        </div>

        {company?.service_radius && <ServiceAreaMap area={company.service_radius} />}

        {areas.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Main cities</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {areas.map((a) => (
                <li key={a.city}>
                  {a.hasPage ? (
                    <Link href={`/service-areas/${a.slug}`} className="flex items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300">
                      <span className="flex items-center gap-2 font-bold text-slate-900">
                        <MapPin size={18} className="text-blue-600" /> {a.city}
                      </span>
                      <ArrowRight size={18} className="text-slate-400" />
                    </Link>
                  ) : (
                    <span className="flex items-center gap-2 p-4 bg-white rounded-2xl border border-slate-200 font-bold text-slate-900">
                      <MapPin size={18} className="text-blue-600" /> {a.city}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {services.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Services in every area</h2>
            <ul className="flex flex-wrap gap-2">
              {services.map((s: any) => (
                <li key={s.slug}>
                  <Link href={`/services/${s.slug}`} className="inline-block px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:border-blue-300">
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="p-6 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-lg font-bold">Not sure if we cover your address? Ask us.</p>
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
