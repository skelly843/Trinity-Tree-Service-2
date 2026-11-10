import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, Briefcase, CalendarDays, FileText, Image as ImageIcon, Lock, Mail, MapPin, MessageSquare, Phone } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { StoredFileLink } from '@/components/StoredFileLink'
import { CustomerNoteComposer } from '@/components/admin/CustomerNoteComposer'
import { PrivatePhotos } from '@/components/employee/PrivatePhotos'
import { storedFileName } from '@/utils/storedFiles'

const IMAGE = /\.(jpe?g|png|gif|webp|heic)$/i

function mapLink(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

/** Everything a worker needs about one customer: where, who, what's been said, and the files. */
export default async function EmployeeCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // The database only returns customers this worker is assigned to or has a visit or job with
  const { data: customer } = await supabase.from('customers').select('*').eq('id', id).maybeSingle()
  if (!customer) notFound()

  const [propsRes, visitsRes, jobsRes, notesRes, docsRes, galleryRes] = await Promise.all([
    supabase.from('customer_properties').select('*').eq('customer_id', id),
    supabase
      .from('appointments')
      .select('id, scheduled_at, service_type, status, notes, customer_properties(address_line, city)')
      .eq('customer_id', id)
      .order('scheduled_at', { ascending: false })
      .limit(20),
    supabase.from('jobs').select('id, job_number, title, status, description, start_date').eq('customer_id', id).order('created_at', { ascending: false }),
    supabase.from('notes').select('id, content, visibility, created_at, profiles(full_name)').eq('customer_id', id).order('created_at', { ascending: false }).limit(50),
    supabase.from('documents').select('id, file_url, file_name, file_type, created_at').eq('customer_id', id).order('created_at', { ascending: false }),
    supabase.from('gallery_items').select('id, title, before_image, after_image, additional_images').eq('customer_id', id)
  ])

  const properties: any[] = propsRes.data || []
  const visits: any[] = visitsRes.data || []
  const jobs: any[] = jobsRes.data || []
  const notes: any[] = notesRes.data || []
  const docs: any[] = docsRes.data || []
  const now = Date.now()
  const upcoming = visits.filter((v) => new Date(v.scheduled_at).getTime() >= now - 3 * 60 * 60 * 1000 && !['completed', 'cancelled', 'no_show'].includes(v.status)).reverse()
  const past = visits.filter((v) => !upcoming.includes(v)).slice(0, 5)

  const isImage = (d: any) => (d.file_type || '').startsWith('image') || IMAGE.test(d.file_name || d.file_url || '')
  const photos = [
    ...docs.filter(isImage).map((d) => ({ ref: d.file_url as string, caption: d.file_name || storedFileName(d.file_url) })),
    ...((galleryRes.data as any[]) || []).flatMap((g) =>
      [g.before_image, g.after_image, ...(Array.isArray(g.additional_images) ? g.additional_images : [])]
        .filter(Boolean)
        .map((ref: string) => ({ ref, caption: g.title || 'Project photo' }))
    )
  ]
  const files = docs.filter((d) => !isImage(d))
  const firstAddress = properties[0] ? [properties[0].address_line, properties[0].city, properties[0].state].filter(Boolean).join(', ') : customer.billing_address || ''

  const card = 'bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3'
  const heading = 'font-bold text-slate-900 flex items-center gap-2'

  return (
    <div className="space-y-6">
      <Link href="/employee/customers" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500">
        <ArrowLeft size={16} /> My Customers
      </Link>

      <div className={card}>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            {customer.first_name} {customer.last_name}
          </h1>
          {customer.business_name && <p className="text-slate-500">{customer.business_name}</p>}
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-semibold text-slate-700">
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100">
              <Phone size={15} /> Call {customer.phone}
            </a>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 min-w-0">
              <Mail size={15} className="shrink-0" /> <span className="truncate">{customer.email}</span>
            </a>
          )}
          {firstAddress && (
            <a href={mapLink(firstAddress)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white">
              <MapPin size={15} /> Directions
            </a>
          )}
        </div>
        {customer.preferred_contact_method && <p className="text-sm text-slate-500">Prefers contact by {customer.preferred_contact_method}.</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className={heading}>
            <CalendarDays size={18} /> Visits
          </h2>
          {upcoming.length === 0 && <p className="text-sm text-slate-400">No upcoming visits.</p>}
          {upcoming.map((v) => (
            <div key={v.id} className="p-3 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-sm font-bold text-blue-800">{format(new Date(v.scheduled_at), 'EEE, MMM d · h:mm a')}</p>
              <p className="font-semibold text-slate-900">{v.service_type}</p>
              {v.customer_properties && (
                <p className="text-sm text-slate-600">{[v.customer_properties.address_line, v.customer_properties.city].filter(Boolean).join(', ')}</p>
              )}
              {v.notes && <p className="text-sm text-slate-600 mt-1">{v.notes}</p>}
            </div>
          ))}
          {past.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold text-slate-600">Past visits ({past.length})</summary>
              <ul className="mt-2 space-y-1 text-slate-600">
                {past.map((v) => (
                  <li key={v.id}>
                    {format(new Date(v.scheduled_at), 'MMM d, yyyy')} · {v.service_type} · {String(v.status).replace('_', ' ')}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section className={card}>
          <h2 className={heading}>
            <Briefcase size={18} /> Jobs
          </h2>
          {jobs.length === 0 && <p className="text-sm text-slate-400">No jobs yet.</p>}
          {jobs.map((j) => (
            <div key={j.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-900">
                  #{j.job_number} {j.title}
                </p>
                <span className="shrink-0 text-[11px] font-bold uppercase text-slate-500">{String(j.status).replace(/_/g, ' ')}</span>
              </div>
              {j.description && <p className="text-sm text-slate-600 mt-1">{j.description}</p>}
            </div>
          ))}
        </section>

        <section className={card}>
          <h2 className={heading}>
            <MapPin size={18} /> Properties
          </h2>
          {properties.length === 0 && <p className="text-sm text-slate-400">No properties on file.</p>}
          {properties.map((p) => {
            const address = [p.address_line, p.city, p.state, p.zip_code].filter(Boolean).join(', ')
            return (
              <div key={p.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <a href={mapLink(address)} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline">
                  {address || 'Address not set'}
                </a>
                {Object.entries(p)
                  .filter(([k, v]) => /note|access|gate|instruction/i.test(k) && typeof v === 'string' && v.trim())
                  .map(([k, v]) => (
                    <p key={k} className="text-sm text-slate-600">
                      {String(v)}
                    </p>
                  ))}
              </div>
            )
          })}
        </section>

        <section className={card}>
          <h2 className={heading}>
            <ImageIcon size={18} /> Photos
          </h2>
          <PrivatePhotos photos={photos} />
        </section>

        <section className={`${card} lg:col-span-2`}>
          <h2 className={heading}>
            <MessageSquare size={18} /> Notes and messages
          </h2>
          <CustomerNoteComposer customerId={customer.id} visibility="internal" placeholder="Add a note for the team (the customer won't see it)..." buttonLabel="Save note" />
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className={`p-3 rounded-xl border ${n.visibility === 'customer_visible' ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{n.content}</p>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  {n.visibility === 'customer_visible' ? 'Message with the customer' : <><Lock size={11} /> Team note</>} · {n.profiles?.full_name || 'Staff'} ·{' '}
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </li>
            ))}
            {notes.length === 0 && <li className="text-sm text-slate-400">No notes yet.</li>}
          </ul>
        </section>

        <section className={`${card} lg:col-span-2`}>
          <h2 className={heading}>
            <FileText size={18} /> Files
          </h2>
          {files.length === 0 && <p className="text-sm text-slate-400">No files yet.</p>}
          <ul className="divide-y divide-slate-100">
            {files.map((d) => (
              <li key={d.id} className="py-2 flex items-center justify-between gap-3">
                <span className="text-sm text-slate-700 truncate">{d.file_name || storedFileName(d.file_url)}</span>
                <StoredFileLink value={d.file_url} label="Open" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
