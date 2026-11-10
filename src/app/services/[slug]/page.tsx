import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { ZoomableImage } from '@/components/blocks/ZoomableImage'
import type { Metadata } from 'next'
import { absoluteUrl, areaList, clip, loadCompanyDetails, loadPublishedServices } from '@/utils/seo'
import { loadSiteBrand } from '@/utils/supabase/loadSiteBrand'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const [services, company, brand] = await Promise.all([loadPublishedServices(), loadCompanyDetails(), loadSiteBrand()])
  const service: any = services.find((s: any) => s.slug === slug)
  if (!service) return { robots: { index: false } }
  const name = company?.company_name || brand.seo_title || brand.site_name
  const areas = areaList(company?.service_areas || [])
  const title = `${service.title}${areas ? ` in ${areas}` : ''} | ${name}`
  const description = clip(`${service.short_description || service.title}${areas ? ` Serving ${areas}.` : ''} Call ${name}${company?.phone ? ` at ${company.phone}` : ''}.`)
  const path = `/services/${service.slug}`
  const image = service.featured_image || brand.logo_url
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', url: path, siteName: name, title, description, ...(image ? { images: [{ url: absoluteUrl(image) }] } : {}) },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description }
  }
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!service) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <Link
          href="/#services"
          className="inline-flex items-center space-x-2 text-slate-500 hover:text-blue-600 transition-colors mb-8 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold">Back to Services</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-8">
            <div>
              <h1 className="text-5xl font-extrabold text-slate-900 leading-tight">{service.title}</h1>
              <p className="mt-6 text-xl text-slate-600 leading-relaxed">{service.short_description}</p>
            </div>

            {service.price_range && (
              <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 inline-block">
                <p className="text-blue-600 font-bold">Estimated Cost: {service.price_range}</p>
              </div>
            )}

            <div className="prose prose-lg text-slate-600">
              <p className="whitespace-pre-wrap">{service.full_description}</p>
            </div>

            <div className="pt-8 border-t border-slate-100">
               <Link
                  href="/signup"
                  className="inline-block bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
                >
                  Book this Service
                </Link>
            </div>
          </div>

          <div className="space-y-8">
             <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl bg-slate-100">
               {service.featured_image ? (
                 <ZoomableImage src={service.featured_image} alt={service.title} />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-slate-300 italic">No image provided</div>
               )}
             </div>

             <div className="p-8 bg-slate-900 rounded-3xl text-white">
                <h3 className="text-xl font-bold mb-6">What's included?</h3>
                <ul className="space-y-4">
                  {['Professional Assessment', 'Full Installation/Repair', 'Quality Guarantee', '24/7 Support'].map((item) => (
                    <li key={item} className="flex items-center space-x-3 text-slate-400">
                      <CheckCircle2 className="text-blue-500" size={20} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
