'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarCheck, FolderOpen, Home, MessageSquare, Receipt, UserCircle } from 'lucide-react'

/**
 * The customer portal's sections, grouped so customers see six choices instead of twelve.
 * The group a page belongs to is highlighted, and its pages show as tabs underneath.
 */
export const PORTAL_GROUPS = [
  { id: 'home', label: 'Home', icon: Home, pages: [{ label: 'Home', href: '/portal' }] },
  {
    id: 'services',
    label: 'Services',
    icon: CalendarCheck,
    pages: [
      { label: 'Appointments', href: '/portal/appointments' },
      { label: 'Jobs', href: '/portal/jobs' },
      { label: 'Requests', href: '/portal/requests' }
    ]
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: Receipt,
    pages: [
      { label: 'Estimates', href: '/portal/estimates' },
      { label: 'Invoices', href: '/portal/invoices' },
      { label: 'Payments', href: '/portal/payments' },
      { label: 'Receipts', href: '/portal/receipts' }
    ]
  },
  {
    id: 'files',
    label: 'Files',
    icon: FolderOpen,
    pages: [
      { label: 'Documents', href: '/portal/documents' },
      { label: 'Project Photos', href: '/portal/photos' }
    ]
  },
  { id: 'messages', label: 'Messages', icon: MessageSquare, pages: [{ label: 'Messages', href: '/portal/notes' }] },
  {
    id: 'account',
    label: 'Account',
    icon: UserCircle,
    pages: [
      { label: 'Profile', href: '/portal/profile' },
      { label: 'Properties', href: '/portal/properties' }
    ]
  }
] as const

function activeGroup(pathname: string) {
  if (pathname === '/portal') return PORTAL_GROUPS[0]
  return PORTAL_GROUPS.find((g) => g.pages.some((p) => p.href !== '/portal' && pathname.startsWith(p.href))) || PORTAL_GROUPS[0]
}

export default function PortalNav() {
  const pathname = usePathname() || '/portal'
  const group = activeGroup(pathname)

  return (
    <nav className="bg-white border-b border-slate-200" aria-label="Customer portal">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Six sections: icon over label in an even row on phones, a single line on wider screens */}
        <ul className="grid grid-cols-6 gap-0.5 py-2 sm:flex sm:gap-1">
          {PORTAL_GROUPS.map((g) => {
            const on = g.id === group.id
            const Icon = g.icon
            return (
              <li key={g.id} className="min-w-0 sm:shrink-0">
                <Link
                  href={g.pages[0].href}
                  aria-current={on ? 'page' : undefined}
                  className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-0 sm:px-4 py-2 rounded-xl text-[11px] tracking-tight sm:tracking-normal sm:text-sm font-bold transition-colors ${
                    on ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} />
                  <span className="truncate max-w-full">{g.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        {/* The chosen section's pages */}
        {group.pages.length > 1 && (
          <ul className="flex gap-5 overflow-x-auto -mb-px [scrollbar-width:none]">
            {group.pages.map((p) => {
              const on = pathname.startsWith(p.href)
              return (
                <li key={p.href} className="shrink-0">
                  <Link
                    href={p.href}
                    aria-current={on ? 'page' : undefined}
                    className={`block py-2.5 text-sm font-semibold border-b-2 ${
                      on ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {p.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </nav>
  )
}
