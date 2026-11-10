'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Loader2, Home, Plus, CheckCircle2, AlertCircle } from 'lucide-react'

export default function CustomerPropertiesPage() {
  const supabase = createClient()
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    propertyType: 'primary_residence',
    addressLine: '',
    city: '',
    state: '',
    zipCode: '',
    notes: ''
  })

  const loadProperties = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Find customer record matches email
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email || '')
        .limit(1)
        .maybeSingle()

      if (customer) {
        const { data } = await supabase
          .from('customer_properties')
          .select('*')
          .eq('customer_id', customer.id)
        setProperties(data || [])
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadProperties()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setSubmitting(false)
      return;
    }

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', user.email || '')
      .limit(1)
      .maybeSingle()

    if (!customer) {
      setError('No customer CRM profile found. Please contact administration.')
      setSubmitting(false)
      return;
    }

    const { error: insErr } = await supabase
      .from('customer_properties')
      .insert([
        {
          customer_id: customer.id,
          property_type: formData.propertyType,
          address_line: formData.addressLine,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          notes: formData.notes
        }
      ])

    if (insErr) {
      setError(insErr.message)
    } else {
      setSuccess('New service property registered successfully!')
      setShowModal(false)
      loadProperties()
    }
    setSubmitting(false)
  }

  return (
    <div className="flex flex-col">

      <main className="max-w-4xl mx-auto px-6 py-12 w-full space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md"
          >
            <Plus size={14} />
            <span>Add Property Address</span>
          </button>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Property Locations</h1>
          <p className="text-slate-500 mt-1">The addresses where you want tree work done. Add gate codes or access notes for the crew.</p>
        </div>

        {success && (
          <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-sm font-semibold text-green-700 flex items-center">
            <CheckCircle2 size={16} className="mr-2" /> {success}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm font-semibold text-red-700 flex items-center">
            <AlertCircle size={16} className="mr-2" /> {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 flex justify-center items-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {properties.map((prop) => (
              <div key={prop.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <Home size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 capitalize">{prop.property_type.replace('_', ' ')}</h3>
                    <p className="text-xs text-slate-400">ID: {prop.id.substring(0, 8)}</p>
                  </div>
                </div>
                <div className="text-sm text-slate-600 font-semibold pl-1">
                  <p>{prop.address_line}</p>
                  <p>{prop.city}, {prop.state} {prop.zip_code}</p>
                </div>
                {prop.notes && (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-lg pl-3 border-l-2 border-l-slate-200">
                    Notes: {prop.notes}
                  </p>
                )}
              </div>
            ))}
            {properties.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200">
                <p className="text-slate-400 italic">No properties yet. Add your primary residence address to request services.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white p-6">
              <h2 className="text-xl font-bold">Register Property Address</h2>
              <p className="text-xs text-slate-400 mt-1">Specify layout category and full street mapping locations.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Property Category</label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="primary_residence">Primary Residence</option>
                  <option value="rental_property">Rental Property</option>
                  <option value="commercial_property">Commercial Property</option>
                  <option value="other">Other / Secondary Location</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Street Address</label>
                <input
                  type="text"
                  value={formData.addressLine}
                  onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="123 Main St"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Waco"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="CA"
                    required
                  />
                </div>
              </div>

              <div className="w-1/2 space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">ZIP Code</label>
                <input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="76701"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Internal Notes (Optional)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g. Front door gate passcode is #1234"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold transition-all shadow-md text-xs disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Add Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
