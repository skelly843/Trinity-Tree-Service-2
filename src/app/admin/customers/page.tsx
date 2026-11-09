import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Search, User, Mail, Phone, Shield, ArrowRight, Users, Filter } from 'lucide-react'
import { Database } from '@/types/database.types'
import { AddCustomerForm } from '@/components/admin/AddCustomerForm'
import { CustomerPortalAccess } from '@/components/admin/CustomerPortalAccess'

type Profile = Database['public']['Tables']['profiles']['Row']

export default async function AdminCustomersPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string, role?: string }>
}) {
  const params = await searchParams
  const queryText = params.q || ''
  const roleFilter = params.role || 'All Roles'

  const supabase = await createClient()

  let dbQuery = supabase.from('profiles').select('*')

  if (queryText) {
    dbQuery = dbQuery.or(`full_name.ilike.%${queryText}%,email.ilike.%${queryText}%`)
  }

  if (roleFilter !== 'All Roles') {
    dbQuery = dbQuery.eq('role', roleFilter.toLowerCase())
  }

  const { data: customers } = await dbQuery.order('created_at', { ascending: false })

  const profiles = (customers as Profile[]) || []

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Customers & Users</h1>
          <p className="text-slate-500 mt-1">Manage user profiles and system permissions.</p>
        </div>
        <div className="flex items-center space-x-2 text-sm bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-semibold border border-blue-100">
          <Users size={18} />
          <span>Total Users: {profiles.length}</span>
        </div>
      </div>

      <AddCustomerForm />

      <CustomerPortalAccess />

      {/* Filter & Search */}
      <form className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            name="q"
            defaultValue={queryText}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <select
              name="role"
              defaultValue={roleFilter}
              className="pl-10 pr-8 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-medium appearance-none"
            >
              <option>All Roles</option>
              <option>Customer</option>
              <option>Employee</option>
              <option>Admin</option>
            </select>
          </div>
          <button type="submit" className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors">
            Apply
          </button>
        </div>
      </form>

      {/* Users List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center text-slate-400">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={20} />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{profile.full_name || 'Unnamed User'}</p>
                        <p className="text-xs text-slate-400">ID: {profile.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 space-y-1">
                    <div className="flex items-center text-xs text-slate-500">
                      <Mail size={12} className="mr-1.5" />
                      {profile.email || 'No email'}
                    </div>
                    {profile.phone && (
                      <div className="flex items-center text-xs text-slate-500">
                        <Phone size={12} className="mr-1.5" />
                        {profile.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      profile.role === 'admin'
                        ? 'text-purple-600 bg-purple-50 border-purple-100'
                        : profile.role === 'employee'
                        ? 'text-blue-600 bg-blue-50 border-blue-100'
                        : 'text-slate-600 bg-slate-50 border-slate-100'
                    }`}>
                      {profile.role === 'admin' && <Shield size={10} className="mr-1" />}
                      {profile.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/customers/${profile.id}`}
                      className="inline-flex items-center space-x-1 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <span>Manage</span>
                      <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <p className="text-slate-400 font-medium">No users found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
