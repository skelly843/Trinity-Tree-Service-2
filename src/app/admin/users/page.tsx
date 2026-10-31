'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { UserCheck, ShieldAlert, CheckCircle2, AlertCircle, Loader2, Plus, Mail, Trash2 } from 'lucide-react'

export default function AdminAccountsPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Invite modal form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('admin')
  const [inviting, setInviting] = useState(false)

  const [customerAccounts, setCustomerAccounts] = useState<any[]>([])

  const loadCustomerAccounts = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, is_active, created_at')
      .eq('role', 'customer')
      .order('is_active', { ascending: true })
      .order('created_at', { ascending: false })
    setCustomerAccounts(data || [])
  }

  const handleSetCustomerAccess = async (userId: string, approved: boolean) => {
    setError(null)
    setSuccess(null)

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ is_active: approved })
      .eq('id', userId)

    if (updateErr) {
      setError(updateErr.message)
    } else {
      setSuccess(approved ? 'Customer account approved.' : 'Customer account access removed.')
      loadCustomerAccounts()
    }
  }

  const loadUsers = async () => {
    setLoading(true)
    // Fetch profiles that belong to administrative roles: 'global_admin', 'admin', 'employee'
    const { data, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['global_admin', 'admin', 'employee'])
      .order('created_at', { ascending: false })

    if (fetchErr) {
      setError(fetchErr.message)
    } else {
      setUsers(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
    loadCustomerAccounts()
  }, [])

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setError(null)
    setSuccess(null)

    // Safety: ensure we don't end up with 0 global admins
    if (newRole !== 'global_admin') {
      const activeGlobalAdmins = users.filter(u => u.role === 'global_admin' && u.is_active)
      if (activeGlobalAdmins.length <= 1 && users.find(u => u.id === userId)?.role === 'global_admin') {
        setError('Accidental lockout protection: There must be at least one active global_admin.')
        return;
      }
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (updateErr) {
      setError(updateErr.message)
    } else {
      setSuccess('User role updated successfully!')
      loadUsers()
    }
  }

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    setError(null)
    setSuccess(null)

    if (currentStatus) {
      // Safety: check global admin lockout
      const activeGlobalAdmins = users.filter(u => u.role === 'global_admin' && u.is_active)
      if (activeGlobalAdmins.length <= 1 && users.find(u => u.id === userId)?.role === 'global_admin') {
        setError('Accidental lockout protection: There must be at least one active global_admin.')
        return;
      }
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ is_active: !currentStatus })
      .eq('id', userId)

    if (updateErr) {
      setError(updateErr.message)
    } else {
      setSuccess('User status updated successfully!')
      loadUsers()
    }
  }

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setError(null)
    setSuccess(null)

    // In a production system, we would trigger standard Supabase invitation or insert a profile placeholder.
    // Let's create an placeholder in profiles or call a secure function if configured.
    // For complete operation, we'll write an audit log and display a prompt simulating invitation flow.
    const { error: inviteErr } = await supabase
      .from('audit_logs')
      .insert([
        {
          action: 'admin_invited',
          details: { email: inviteEmail, name: inviteName, role: inviteRole }
        }
      ])

    if (inviteErr) {
      setError(inviteErr.message)
    } else {
      setSuccess(`Success! Simulated administrative invitation email sent to ${inviteEmail}.`)
      setInviteEmail('')
      setInviteName('')
    }
    setInviting(false)
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Accounts</h1>
        <p className="text-slate-500 mt-1">Approve customer logins and manage global admins, regional admins, and employee credentials.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="font-bold text-slate-800 flex items-center">
            <UserCheck size={18} className="mr-2 text-slate-400" />
            Customer Logins
          </h2>
          <span className="text-xs font-bold text-amber-700">
            {customerAccounts.filter((c) => !c.is_active).length} waiting for approval
          </span>
        </div>
        <div className="divide-y divide-slate-50">
          {customerAccounts.map((account) => (
            <div key={account.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800">{account.full_name || 'Unnamed customer'}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{account.email}</p>
              </div>
              {account.is_active ? (
                <button
                  onClick={() => handleSetCustomerAccess(account.id, false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border text-red-600 bg-red-50 border-red-100 hover:bg-red-100"
                >
                  Remove Access
                </button>
              ) : (
                <button
                  onClick={() => handleSetCustomerAccess(account.id, true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border text-green-600 bg-green-50 border-green-100 hover:bg-green-100"
                >
                  Approve
                </button>
              )}
            </div>
          ))}
          {customerAccounts.length === 0 && (
            <p className="px-6 py-10 text-center text-slate-400 italic text-sm">No customer logins yet.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Users List Column */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h2 className="font-bold text-slate-800 flex items-center">
              <UserCheck size={18} className="mr-2 text-slate-400" />
              Administrative Profiles
            </h2>
            <button onClick={loadUsers} className="text-xs font-bold text-blue-600 hover:underline">
              Refresh List
            </button>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="animate-spin text-blue-600" size={24} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{item.full_name || 'Unnamed staff'}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{item.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={item.role || 'admin'}
                          onChange={(e) => handleUpdateRole(item.id, e.target.value)}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="global_admin">Global Admin</option>
                          <option value="admin">Admin</option>
                          <option value="employee">Employee</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        {item.is_active ? (
                          <span className="inline-flex px-2.5 py-1 text-xs font-bold text-green-700 bg-green-50 border border-green-100 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleActive(item.id, item.is_active)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            item.is_active
                              ? 'text-red-600 bg-red-50 border-red-100 hover:bg-red-100'
                              : 'text-green-600 bg-green-50 border-green-100 hover:bg-green-100'
                          }`}
                        >
                          {item.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                        No administrative users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invite Admin Column */}
        <div className="lg:col-span-4 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center space-x-2">
            <Mail className="text-blue-600" size={20} />
            <h2 className="font-extrabold text-slate-900 text-lg">Invite New Staff</h2>
          </div>

          <form onSubmit={handleInviteAdmin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Marcus Rodriguez"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="marcus@company.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Assigned Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="admin">Admin (Regional client/job manager)</option>
                <option value="employee">Employee (Service Technician)</option>
                <option value="global_admin">Global Admin (Full access)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={inviting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
            >
              {inviting ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              <span>Send Portal Invitation</span>
            </button>
          </form>

          {/* Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-start space-x-1.5">
              <ShieldAlert size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700 flex items-start space-x-1.5">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
