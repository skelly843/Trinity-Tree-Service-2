import { businessJsonLd } from '@/utils/seo'

/** Business name, phone, service area and services, in the format search engines read. */
export default async function BusinessJsonLd() {
  const json = await businessJsonLd()
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
