'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, FileCheck, Sun, Users, Wallet } from 'lucide-react'

const ITEMS = [
  { label: 'Today', href: '/employee', icon: Sun },
  { label: 'Schedule', href: '/employee/calendar', icon: CalendarDays },
  { label: 'Customers', href: '/employee/customers', icon: Users },
  { label: 'Estimates', href: '/admin/estimates', icon: FileCheck },
  { label: 'My Pay', href: '/employee/pay', icon: Wallet }
]

/** Five tools an employee uses each day; fits in one row on a phone. */
export default function EmployeeNav() {
  const pathname = usePathname() || '/employee'
  return (
    <nav className="bg-white border-b border-slate-200" aria-label="Employee">
      <ul className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-5 gap-0.5 py-2 sm:flex sm:gap-1">
        {ITEMS.map((item) => {
          const on = item.href === '/employee' ? pathname === '/employee' : pathname.startsWith(item.href)
          return (
            <li key={item.href} className="min-w-0 sm:shrink-0">
              <Link
                href={item.href}
                aria-current={on ? 'page' : undefined}
                className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-0 sm:px-4 py-2 rounded-xl text-[11px] sm:text-sm font-bold tracking-tight sm:tracking-normal ${
                  on ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <item.icon size={18} />
                <span className="truncate max-w-full">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
