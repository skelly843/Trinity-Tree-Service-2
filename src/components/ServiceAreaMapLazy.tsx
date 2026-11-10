'use client'

import dynamic from 'next/dynamic'

// Leaflet needs the browser, so the map loads after the page instead of during the server render
const ServiceAreaMapLazy = dynamic(() => import('./ServiceAreaMap'), {
  ssr: false,
  loading: () => <div className="h-80 w-full rounded-2xl bg-slate-100 border border-slate-200 animate-pulse" />
})

export default ServiceAreaMapLazy
export type { ServiceRadius } from './ServiceAreaMap'
