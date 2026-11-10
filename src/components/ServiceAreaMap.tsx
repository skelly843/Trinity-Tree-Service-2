'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import L from 'leaflet'
import { Circle, CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'

export interface ServiceRadius {
  lat: number
  lng: number
  miles: number
  label?: string
}

const METERS_PER_MILE = 1609.344

/** Zooms the map so the whole circle is in view whenever it moves or changes size. */
function FitCircle({ area }: { area: ServiceRadius }) {
  const map = useMap()
  useEffect(() => {
    const bounds = L.latLng(area.lat, area.lng).toBounds(area.miles * METERS_PER_MILE * 2)
    map.fitBounds(bounds, { padding: [16, 16] })
  }, [map, area.lat, area.lng, area.miles])
  return null
}

function ClickToMove({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

/** OpenStreetMap with the service area drawn as a circle; in the admin, clicking moves the center. */
export default function ServiceAreaMap({
  area,
  onPick,
  className = 'h-80 w-full rounded-2xl overflow-hidden border border-slate-200'
}: {
  area: ServiceRadius
  onPick?: (lat: number, lng: number) => void
  className?: string
}) {
  return (
    // isolate keeps the map's layers below the sticky header and pop-ups
    <div className={`isolate ${className}`}>
      <MapContainer
        center={[area.lat, area.lng]}
        zoom={6}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', cursor: onPick ? 'crosshair' : undefined }}
        attributionControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Circle
          center={[area.lat, area.lng]}
          radius={area.miles * METERS_PER_MILE}
          pathOptions={{ color: 'var(--color-blue-600, #2563eb)', fillColor: 'var(--color-blue-600, #2563eb)', fillOpacity: 0.12, weight: 2 }}
        />
        <CircleMarker center={[area.lat, area.lng]} radius={6} pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#1e40af', fillOpacity: 1 }} />
        <FitCircle area={area} />
        {onPick && <ClickToMove onPick={onPick} />}
      </MapContainer>
    </div>
  )
}
