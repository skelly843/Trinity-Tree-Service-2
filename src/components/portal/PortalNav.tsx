'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarCheck, FolderOpen, Home, MessageSquare, Receipt, UserCircle } from 'lucide-react'

type Group = { id: string; label: string; icon: typeof Home; pages: { label: string; href: string }[] }

const FINANCES = [
  { label: 'Estimates', href: '/portal/estimates' },
  { label: 'Invoices', href: '/portal/invoices' },
  { label: 'Payments', href: '/portal/payments' },
  { label: 'Receipts', href: '/portal/receipts' }
]
const MESSAGES = [{ label: 'Messages & Notes', href: '/portal/notes' }]
const HOME = [{ label: 'Home', href: '/portal' }]

/** On a computer: six sections, each with its pages as tabs. */
export const DESKTOP_GROUPS: Group[] = [
  { id: 'home', label: 'Dashboard', icon: Home, pages: HOME },
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
  { id: 'finances', label: 'Finances', icon: Receipt, pages: FINANCES },
  {
    id: 'files',
    label: 'Files',
    icon: FolderOpen,
    pages: [
      { label: 'Documents', href: '/portal/documents' },
      { label: 'Project Photos', href: '/portal/photos' }
    ]
  },
  { id: 'messages', label: 'Messages', icon: MessageSquare, pages: MESSAGES },
  {
    id: 'account',
    label: 'Account',
    icon: UserCircle,
    pages: [
      { label: 'Profile', href: '/portal/profile' },
      { label: 'Properties', href: '/portal/properties' }
    ]
  }
]

/** On a phone: just Home, My Profile, Finances and Messages. */
export const PHONE_GROUPS: Group[] = [
  { id: 'home', label: 'Home', icon: Home, pages: HOME },
  {
    id: 'profile',
    label: 'My Profile',
    icon: UserCircle,
    pages: [
      { label: 'Profile', href: '/portal/profile' },
      { label: 'Properties', href: '/portal/properties' },
      { label: 'Appointments', href: '/portal/appointments' },
      { label: 'Requests', href: '/portal/requests' },
      { label: 'Jobs', href: '/portal/jobs' },
      { label: 'Documents', href: '/portal/documents' },
      { label: 'Project Photos', href: '/portal/photos' }
    ]
  },
  { id: 'finances', label: 'Finances', icon: Receipt, pages: FINANCES },
  { id: 'messages', label: 'Messages', icon: MessageSquare, pages: MESSAGES }
]

function activeGroup(groups: Group[], pathname: string) {
  if (pathname === '/portal') return groups[0]
  return groups.find((g) => g.pages.some((p) => p.href !== '/portal' && pathname.startsWith(p.href))) || groups[0]
}

function Menu({ groups, pathname, phone }: { groups: Group[]; pathname: string; phone: boolean }) {
  const group = activeGroup(groups, pathname)
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <ul className={phone ? 'grid grid-cols-4 gap-1 py-2' : 'flex gap-1 py-2'}>
        {groups.map((g) => {
          const on = g.id === group.id
          const Icon = g.icon
          return (
            <li key={g.id} className="min-w-0">
              <Link
                href={g.pages[0].href}
                aria-current={on ? 'page' : undefined}
                className={`flex items-center rounded-xl font-bold transition-colors ${
                  phone ? 'flex-col gap-1 px-1 py-2 text-xs' : 'gap-2 px-4 py-2 text-sm'
                } ${on ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Icon size={phone ? 20 : 18} />
                <span className="truncate max-w-full">{g.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      {/* The chosen section's pages; scrolls sideways if they don't fit */}
      {group.pages.length > 1 && (
        <ul className="flex gap-5 overflow-x-auto -mb-px [scrollbar-width:none]">
          {group.pages.map((p) => {
            const on = pathname.startsWith(p.href)
            return (
              <li key={p.href} className="shrink-0">
                <Link
                  href={p.href}
                  aria-current={on ? 'page' : undefined}
                  // Keep the current page visible when the row scrolls sideways on a phone
                  ref={on ? (el) => el?.scrollIntoView({ block: 'nearest', inline: 'center' }) : undefined}
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
  )
}

/** Customer portal menu: the full set on a computer, four simple choices on a phone. */
export default function PortalNav() {
  const pathname = usePathname() || '/portal'
  return (
    <nav className="bg-white border-b border-slate-200" aria-label="Customer portal">
      <div className="hidden sm:block">
        <Menu groups={DESKTOP_GROUPS} pathname={pathname} phone={false} />
      </div>
      <div className="sm:hidden">
        <Menu groups={PHONE_GROUPS} pathname={pathname} phone />
      </div>
    </nav>
  )
}
