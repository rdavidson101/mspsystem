import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, Pencil, UserX, CheckCircle2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import clsx from 'clsx'

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  MANAGER: 'bg-purple-100 text-purple-700',
  TECHNICIAN: 'bg-blue-100 text-blue-700',
  CLIENT: 'bg-slate-100 text-slate-600',
}

const emptyInternal = { userType: 'INTERNAL', firstName: '', lastName: '', email: '', password: '', role: 'TECHNICIAN', phone: '' }
const emptyClient = { userType: 'CLIENT', firstName: '', lastName: '', email: '', phone: '', companyId: '', role: 'CLIENT' }

export default function UserManagementPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'INTERNAL' | 'CLIENT'>('INTERNAL')
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  const [form, setForm] = useState<any>(emptyInternal)

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) })
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) })

  const filtered = users.filter((u: any) => (u.userType || 'INTERNAL') === tab)

  const saveMutation = useMutation({
    mutationFn: (data: any) => editUser
      ? api.patch(`/users/${editUser.id}`, data).then(r => r.data)
      : api.post('/users', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowModal(false) },
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  function openCreate() {
    setEditUser(null)
    setForm(tab === 'INTERNAL' ? { ...emptyInternal } : { ...emptyClient })
    setShowModal(true)
  }

  function openEdit(u: any) {
    setEditUser(u)
    setForm({ ...u, password: '', userType: u.userType || 'INTERNAL' })
    setShowModal(true)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500">{users.length} total users</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(['INTERNAL', 'CLIENT'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {t === 'INTERNAL' ? 'Internal Staff' : 'Client Users'}
            <span className="ml-2 text-xs bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5">
              {users.filter((u: any) => (u.userType || 'INTERNAL') === t).length}
            </span>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Name</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Email</th>
              {tab === 'INTERNAL' && <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Role</th>}
              {tab === 'CLIENT' && <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Company</th>}
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Phone</th>
              {tab === 'INTERNAL' && <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">2FA</th>}
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Status</th>
              <th className="py-3 px-4 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u: any) => (
              <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <span className="text-sm font-medium text-slate-800">{u.firstName} {u.lastName}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{u.email || '—'}</td>
                {tab === 'INTERNAL' && (
                  <td className="py-3 px-4">
                    <span className={clsx('badge text-xs', roleColors[u.role] || 'bg-slate-100 text-slate-600')}>{u.role}</span>
                  </td>
                )}
                {tab === 'CLIENT' && (
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {companies.find((c: any) => c.id === u.companyId)?.name || '—'}
                  </td>
                )}
                <td className="py-3 px-4 text-sm text-slate-500">{u.phone || '—'}</td>
                {tab === 'INTERNAL' && (
                  <td className="py-3 px-4">
                    {u.twoFactorEnabled
                      ? <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle2 size={12} /> Enabled</span>
                      : <span className="text-xs text-slate-400">Disabled</span>}
                  </td>
                )}
                <td className="py-3 px-4">
                  <span className={clsx('badge text-xs', u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deactivateMutation.mutate(u.id)} className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500">
                      <UserX size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-sm text-slate-400">No {tab === 'INTERNAL' ? 'internal staff' : 'client users'} found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editUser ? 'Edit User' : `Add ${tab === 'INTERNAL' ? 'Internal' : 'Client'} User`}
        size="md"
      >
        <div className="space-y-4">
          {!editUser && (
            <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
              {(['INTERNAL', 'CLIENT'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => {
                    setForm(t === 'INTERNAL' ? { ...emptyInternal } : { ...emptyClient })
                  }}
                  className={clsx('flex-1 py-1.5 rounded-md text-sm font-medium transition-colors',
                    form.userType === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  )}
                >
                  {t === 'INTERNAL' ? 'Internal Staff' : 'Client User'}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name</label>
              <input className="input" value={form.firstName} onChange={e => setForm((f: any) => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.lastName} onChange={e => setForm((f: any) => ({ ...f, lastName: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone || ''} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} />
          </div>
          {form.userType === 'INTERNAL' && (
            <>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm((f: any) => ({ ...f, role: e.target.value }))}>
                  <option value="TECHNICIAN">Technician</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="label">{editUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
                <input className="input" type="password" value={form.password} onChange={e => setForm((f: any) => ({ ...f, password: e.target.value }))} />
              </div>
            </>
          )}
          {form.userType === 'CLIENT' && (
            <div>
              <label className="label">Company</label>
              <select className="input" value={form.companyId || ''} onChange={e => setForm((f: any) => ({ ...f, companyId: e.target.value }))}>
                <option value="">Select company</option>
                {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary text-sm">Cancel</button>
            <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="btn-primary text-sm">
              {saveMutation.isPending ? 'Saving…' : 'Save User'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
