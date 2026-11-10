import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  Clock,
  ShieldAlert,
  Save,
  MessageSquare,
  Plus,
  ArrowRight,
  Lock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { CustomerNoteComposer } from '@/components/admin/CustomerNoteComposer'
import { CreateCustomerRecord } from '@/components/admin/CreateCustomerRecord'
import { AssignArborist } from '@/components/admin/AssignArborist'

const TABS = [
  { id: 'history', label: 'Service History' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'notes', label: 'Private Notes' },
  { id: 'messages', label: 'Messages' }
] as const
type TabId = (typeof TABS)[number]['id']

const OPEN_INVOICE = ['sent', 'partial', 'overdue']

function money(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function invoiceBalance(inv: any) {
  return Math.max(Number(inv.total || 0) - Number(inv.amount_paid || 0), 0)
}

export default async function CustomerDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; success?: string; error?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const tab: TabId = TABS.some((t) => t.id === query.tab) ? (query.tab as TabId) : 'history'
  const supabase = await createClient()

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
  if (!profile) notFound()

  const {
    data: { user }
  } = await supabase.auth.getUser()
  const { data: viewer } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null }
  const viewerIsGlobalAdmin = viewer?.role === 'global_admin'
  const viewerIsOffice = viewerIsGlobalAdmin || viewer?.role === 'admin'

  // Appointments, invoices and messages hang off the customer record (Customers & CRM),
  // which is linked to this login directly or by the same email address.
  let customer: any = null
  const linkedId = (profile as any).customer_id as string | null
  if (linkedId) {
    const { data } = await supabase.from('customers').select('*').eq('id', linkedId).maybeSingle()
    customer = data
  }
  if (!customer && profile.email) {
    const { data } = await supabase.from('customers').select('*').ilike('email', profile.email).limit(5)
    customer = (data || []).find((c: any) => (c.email || '').toLowerCase() === profile.email!.toLowerCase()) || null
  }

  const { data: staff } = viewerIsOffice
    ? await supabase.from('profiles').select('id, full_name, email').in('role', ['global_admin', 'admin', 'employee']).order('full_name')
    : { data: [] as any[] }

  const [appointmentsRes, invoicesRes, notesRes] = customer
    ? await Promise.all([
        supabase.from('appointments').select('*').eq('customer_id', customer.id).order('scheduled_at', { ascending: false }),
        supabase.from('invoices').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }),
        supabase
          .from('notes')
          .select('*, profiles(full_name)')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: true })
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const appointments: any[] = appointmentsRes.data || []
  const invoices: any[] = invoicesRes.data || []
  const notes: any[] = notesRes.data || []
  const privateNotes = notes.filter((n) => n.visibility !== 'customer_visible').reverse()
  const messages = notes.filter((n) => n.visibility === 'customer_visible')

  const paidCount = invoices.filter((i) => i.status === 'paid').length
  const unpaid = invoices.filter((i) => OPEN_INVOICE.includes(i.status)).reduce((sum, i) => sum + invoiceBalance(i), 0)

  const name = profile.full_name || (customer ? `${customer.first_name} ${customer.last_name}` : profile.email)
  const newAppointmentHref = customer ? `/admin/calendar?new=1&customer=${customer.id}` : null
  const newInvoiceHref = customer ? `/admin/invoices?new=1&customer=${customer.id}` : null
  const tabHref = (t: TabId) => `/admin/customers/${profile.id}?tab=${t}`

  const roleLabel = profile.role === 'global_admin' ? 'Owner (global admin)' : profile.role

  return (
    <div className="p-8 space-y-8">
      <Link
        href="/admin/customers"
        className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft size={16} className="mr-1" />
        Back to Users
      </Link>

      {query.success && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-sm font-semibold text-green-700 flex items-center">
          <CheckCircle2 size={16} className="mr-2" /> Role updated.
        </div>
      )}
      {query.error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm font-semibold text-red-700 flex items-center">
          <AlertCircle size={16} className="mr-2" /> {query.error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* User Sidebar Info */}
        <div className="w-full lg:w-80 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center">
            <div className="w-24 h-24 rounded-full bg-slate-100 mx-auto mb-4 border border-slate-200 flex items-center justify-center text-slate-300 overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={48} />
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{name}</h2>
            <p className="text-sm text-slate-500 font-medium capitalize">{roleLabel}</p>

            <div className="mt-6 pt-6 border-t border-slate-50 space-y-3 text-left">
              <div className="flex items-center text-sm text-slate-600">
                <Mail size={16} className="mr-3 text-slate-400 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
              <div className="flex items-center text-sm text-slate-600">
                <Phone size={16} className="mr-3 text-slate-400 shrink-0" />
                <span>{profile.phone || customer?.phone || 'No phone set'}</span>
              </div>
              <div className="flex items-center text-sm text-slate-600">
                <Clock size={16} className="mr-3 text-slate-400 shrink-0" />
                <span>Joined {new Date(profile.created_at || '').toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {customer && viewerIsOffice && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <AssignArborist customerId={customer.id} currentId={customer.assigned_admin_id} staff={staff || []} />
            </div>
          )}

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
              <ShieldAlert size={16} className="mr-2 text-orange-500" />
              Manage Permissions
            </h3>
            {profile.role === 'global_admin' ? (
              <p className="text-sm text-slate-500">This is the site owner&apos;s account. Its role can&apos;t be changed here.</p>
            ) : !viewerIsGlobalAdmin ? (
              <p className="text-sm text-slate-500">Only the site owner (global admin) can change roles.</p>
            ) : (
              <form action="/api/admin/update-role" method="POST" className="space-y-4">
                <input type="hidden" name="userId" value={profile.id} />
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Assign Role</label>
                  <select
                    name="role"
                    defaultValue={profile.role || 'customer'}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="customer">Customer</option>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors flex items-center justify-center"
                >
                  <Save size={16} className="mr-2" />
                  Update Role
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 space-y-8">
          {!customer && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-3">
              <p className="font-bold text-amber-900">No customer record for this login yet</p>
              <p className="text-sm text-amber-800">
                Appointments, invoices and messages are kept on a customer record in Customers &amp; CRM. Create one for{' '}
                {profile.email} to use the buttons below.
              </p>
              <CreateCustomerRecord fullName={profile.full_name || ''} email={profile.email || ''} />
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Appointments</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{appointments.length}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paid Invoices</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{paidCount}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unpaid Balance</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{money(unpaid)}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <nav className="flex overflow-x-auto border-b border-slate-100" aria-label="Customer sections">
              {TABS.map((t) => (
                <Link
                  key={t.id}
                  href={tabHref(t.id)}
                  scroll={false}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className={`px-6 py-4 text-sm font-bold whitespace-nowrap ${
                    tab === t.id ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {t.label}
                  {t.id === 'messages' && messages.length > 0 && (
                    <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{messages.length}</span>
                  )}
                </Link>
              ))}
            </nav>

            <div className="p-6">
              {tab === 'history' && (
                <>
                  <div className="flex items-center justify-between mb-6 gap-4">
                    <h4 className="font-bold text-slate-900">Recent Appointments</h4>
                    {newAppointmentHref && (
                      <Link
                        href={newAppointmentHref}
                        className="flex items-center space-x-1 text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus size={14} />
                        <span>Create Appointment</span>
                      </Link>
                    )}
                  </div>
                  <div className="space-y-4">
                    {appointments.map((apt) => (
                      <Link
                        key={apt.id}
                        href="/admin/calendar"
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-300"
                      >
                        <div className="flex items-center space-x-4 min-w-0">
                          <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-blue-600">
                            <Calendar size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{apt.service_type}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(apt.scheduled_at).toLocaleDateString()} at{' '}
                              {new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span
                            className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              apt.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {String(apt.status || '').replace('_', ' ')}
                          </span>
                          <ArrowRight size={16} className="text-slate-300" />
                        </div>
                      </Link>
                    ))}
                    {appointments.length === 0 && (
                      <p className="text-center py-12 text-slate-400 italic">No appointment history found.</p>
                    )}
                  </div>
                </>
              )}

              {tab === 'invoices' && (
                <>
                  <div className="flex items-center justify-between mb-6 gap-4">
                    <h4 className="font-bold text-slate-900">Invoices</h4>
                    {newInvoiceHref && (
                      <Link
                        href={newInvoiceHref}
                        className="flex items-center space-x-1 text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus size={14} />
                        <span>Create Invoice</span>
                      </Link>
                    )}
                  </div>
                  <div className="space-y-3">
                    {invoices.map((inv) => (
                      <Link
                        key={inv.id}
                        href="/admin/invoices"
                        className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-300"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-purple-600">
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800">Invoice #{inv.invoice_number}</p>
                            <p className="text-xs text-slate-500">
                              Issued {inv.issue_date ? new Date(`${inv.issue_date}T00:00:00`).toLocaleDateString() : '-'}
                              {inv.due_date ? ` · Due ${new Date(`${inv.due_date}T00:00:00`).toLocaleDateString()}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-slate-900">{money(Number(inv.total || 0))}</p>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{inv.status}</p>
                        </div>
                      </Link>
                    ))}
                    {invoices.length === 0 && <p className="text-center py-12 text-slate-400 italic">No invoices yet.</p>}
                  </div>
                </>
              )}

              {tab === 'notes' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <Lock size={16} className="text-slate-400" /> Private Notes
                    </h4>
                    <p className="text-sm text-slate-500 mt-1">Only staff see these. The customer never does.</p>
                  </div>
                  {customer && (
                    <CustomerNoteComposer
                      customerId={customer.id}
                      visibility="internal"
                      placeholder="Gate code, dog in the yard, prefers morning visits..."
                      buttonLabel="Save note"
                    />
                  )}
                  <div className="space-y-3">
                    {privateNotes.map((n) => (
                      <div key={n.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-sm text-slate-800 whitespace-pre-wrap">{n.content}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          {n.profiles?.full_name || 'Staff'} · {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                    {privateNotes.length === 0 && <p className="text-center py-8 text-slate-400 italic">No private notes yet.</p>}
                  </div>
                </div>
              )}

              {tab === 'messages' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <MessageSquare size={16} className="text-blue-500" /> Messages
                    </h4>
                    <p className="text-sm text-slate-500 mt-1">
                      The customer reads and answers these in their portal under Messages.
                    </p>
                  </div>
                  <div className="space-y-3 max-h-[28rem] overflow-y-auto">
                    {messages.map((m) => {
                      const fromCustomer = m.author_id && m.author_id === profile.id
                      return (
                        <div key={m.id} className={`flex ${fromCustomer ? 'justify-start' : 'justify-end'}`}>
                          <div
                            className={`max-w-[80%] p-4 rounded-2xl ${
                              fromCustomer ? 'bg-slate-100 text-slate-800' : 'bg-blue-600 text-white'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                            <p className={`text-[11px] mt-2 ${fromCustomer ? 'text-slate-500' : 'text-blue-100'}`}>
                              {fromCustomer ? name : m.profiles?.full_name || 'Staff'} · {new Date(m.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    {messages.length === 0 && <p className="text-center py-8 text-slate-400 italic">No messages yet.</p>}
                  </div>
                  {customer && (
                    <CustomerNoteComposer
                      customerId={customer.id}
                      visibility="customer_visible"
                      placeholder={`Write a message to ${name}...`}
                      buttonLabel="Send message"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {customer && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link
                href={`${tabHref('messages')}#compose`}
                className="flex items-center justify-center space-x-2 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <MessageSquare size={20} className="text-blue-500" />
                <span>Message Customer</span>
              </Link>
              <Link
                href={newInvoiceHref!}
                className="flex items-center justify-center space-x-2 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <FileText size={20} className="text-purple-500" />
                <span>Create Invoice</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
