'use client'

import Script from 'next/script'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ADS_ID, GA_ID, trackCall } from '@/utils/tracking'

const PRIVATE_AREAS = ['/admin', '/employee', '/portal', '/auth', '/reset-password']

/**
 * Loads Google Analytics / Google Ads only when their IDs are set, and only on public pages
 * (the admin, employee and customer areas are never tracked). Counts taps on phone links.
 */
export default function Analytics() {
  const pathname = usePathname() || '/'
  const ids = [GA_ID, ADS_ID].filter(Boolean)
  const tracked = ids.length > 0 && !PRIVATE_AREAS.some((p) => pathname.startsWith(p))

  useEffect(() => {
    if (!tracked) return
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement)?.closest?.('a[href^="tel:"]')
      if (link) trackCall(window.location.pathname)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [tracked])

  if (!tracked) return null
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${ids[0]}`} strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
${ids.map((id) => `gtag('config', ${JSON.stringify(id)});`).join('\n')}`}
      </Script>
    </>
  )
}
