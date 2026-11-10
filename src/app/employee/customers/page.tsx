import { Mail, MapPin, Phone } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'

/** The customers this worker is assigned to (the database returns no others). */
export default async function EmployeeCustomers() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('customers')
    .select('id, first_name, last_name, business_name, phone, email, billing_address, customer_properties(address_line, city)')
    .order('last_name', { ascending: true })
  const customers: any[] = data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">My Customers</h1>
        <p className="text-slate-500 mt-1">Customers assigned to you. Ask the office if someone is missing.</p>
      </div>

      {customers.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {customers.map((c) => {
            const address = c.customer_properties?.[0]
              ? [c.customer_properties[0].address_line, c.customer_properties[0].city].filter(Boolean).join(', ')
              : c.billing_address || ''
            return (
              <li key={c.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div>
                  <p className="font-bold text-slate-900">
                    {c.first_name} {c.last_name}
                  </p>
                  {c.business_name && <p className="text-sm text-slate-500">{c.business_name}</p>}
                </div>
                <div className="flex flex-wrap gap-2 text-sm font-semibold text-slate-700">
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100">
                      <Phone size={15} /> {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 min-w-0">
                      <Mail size={15} className="shrink-0" /> <span className="truncate">{c.email}</span>
                    </a>
                  )}
                  {address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 min-w-0"
                    >
                      <MapPin size={15} className="shrink-0" /> <span className="truncate">{address}</span>
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">No customers are assigned to you yet.</p>
      )}
    </div>
  )
}
