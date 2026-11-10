'use client'

import { usePathname } from 'next/navigation'
import { Phone } from 'lucide-react'

const HIDDEN_ON = ['/admin', '/employee', '/portal', '/auth']

/** A "Call" button that stays at the bottom-left on phones, on the public pages. */
export default function CallButton({ phone }: { phone: string }) {
  const pathname = usePathname() || '/'
  const digits = phone.replace(/[^\d+]/g, '')
  if (digits.length < 7 || HIDDEN_ON.some((p) => pathname.startsWith(p))) return null
  return (
    <a
      href={`tel:${digits}`}
      className="md:hidden fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-green-600 text-white font-bold shadow-lg active:bg-green-700"
      aria-label={`Call ${phone}`}
    >
      <Phone size={18} /> Call
    </a>
  )
}
