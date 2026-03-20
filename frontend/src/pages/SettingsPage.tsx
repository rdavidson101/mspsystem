import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { User, Users, Shield, Bell, Tag, Plus, Trash2, Pencil, Clock } from 'lucide-react'
import Modal from '@/components/ui/Modal'

const PRESET_COLORS = ['#3b82f6','#f97316','#8b5cf6','#06b6d4','#ef4444','#10b981','#f59e0b','#ec4899','#6366f1','#14b8a6']

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('profile')
  const [profileForm, setProfileForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', email: user?.email || '', phone: '' })
  const [saved, setSaved] = useState(false)
  const [newUserForm, setNewUserForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'TECHNICIAN' })
  const [showCatModal, setShowCatModal] = useState(false)
  const [editingCat, setEditingCat] = useState<any>(null)
  const [catForm, setCatForm] = useState({ name: '', color: '#6366f1' })

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) })

  const defaultSla: Record<string, { responseTime: number; resolutionTime: number }> = {
    LOW: { responseTime: 480, resolutionTime: 2880 },
    MEDIUM: { responseTime: 240, resolutionTime: 1440 },
    HIGH: { responseTime: 60, resolutionTime: 480 },
    CRITICAL: { responseTime: 15, resolutionTime: 120 },
  }
  const [slaPolicies, setSlaPolicies] = useState<Record<string, { responseTime: number; resolutionTime: number }>>(defaultSla)
  const [slaSaved, setSlaSaved] = useState<Record<string, boolean>>({})

  useQuery({
    queryKey: ['sla'],
    queryFn: () => api.get('/sla').then(r => r.data),
    enabled: activeTab === 'sla',
    onSuccess: (data: any[]) => {
      if (data && data.length > 0) {
        const mapped: Record<string, { responseTime: number; resolutionTime: number }> = { ...defaultSla }
        data.forEach((item: any) => {
          mapped[item.priority] = { responseTime: item.responseTime, resolutionTime: item.resolutionTime }
        })
        setSlaPolicies(mapped)
      }
    },
  } as any)

  async function saveSlaRow(priority: string) {
    await api.put('/sla', { priority, ...slaPolicies[priority] })
    setSlaSaved(s => ({ ...s, [priority]: true }))
    setTimeout(() => setSlaSaved(s => ({ ...s, [priority]: false })), 2000)
  }

  const priorityBadgeColors: Record<string, string> = {
    LOW: 'bg-slate-100 text-slate-600',
    MEDIUM: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-orange-100 text-orange-700',
    CRITICAL: 'bg-red-100 text-red-700',
  }

  const createUserMutation = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setNewUserForm({ firstName: '', lastName: '', email: '', password: '', role: 'TECHNICIAN' }) },
  })
  const catMutation = useMutation({
    mutationFn: (data: any) => editingCat ? api.put(`/categories/${editingCat.id}`, data) : api.post('/categories', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setShowCatModal(false); setEditingCat(null) },
  })
  const deleteCatMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    await api.put(`/users/${user?.id}`, profileForm)
    updateUser(profileForm)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function openEditCat(cat: any) { setEditingCat(cat); setCatForm({ name: cat.name, color: cat.color }); setShowCatModal(true) }
  function openNewCat() { setEditingCat(null); setCatForm({ name: '', color: '#6366f1' }); setShowCatModal(true) }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'sla', label: 'SLA Policies', icon: Clock },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Profile Settings</h2>
          <form onSubmit={saveProfile} className="space-y-4 max-w-md">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">First Name</label><input className="input" value={profileForm.firstName} onChange={e => setProfileForm(f => ({ ...f, firstName: e.target.value }))} /></div>
              <div><label className="label">Last Name</label><input className="input" value={profileForm.lastName} onChange={e => setProfileForm(f => ({ ...f, lastName: e.target.value }))} /></div>
            </div>
            <div><label className="label">Email</label><input type="email" className="input" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="label">Phone</label><input className="input" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="flex items-center gap-3">
              <button type="submit" className="btn-primary">Save Changes</button>
              {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
            </div>
          </form>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Team Members</h2>
            <div className="space-y-3">
              {users.map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">{u.firstName[0]}{u.lastName[0]}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  <span className="badge bg-primary-50 text-primary-700 text-xs">{u.role}</span>
                  <span className={`badge text-xs ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Invite Team Member</h2>
            <form onSubmit={e => { e.preventDefault(); createUserMutation.mutate(newUserForm) }} className="space-y-4 max-w-md">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">First Name</label><input className="input" value={newUserForm.firstName} onChange={e => setNewUserForm(f => ({ ...f, firstName: e.target.value }))} required /></div>
                <div><label className="label">Last Name</label><input className="input" value={newUserForm.lastName} onChange={e => setNewUserForm(f => ({ ...f, lastName: e.target.value }))} required /></div>
              </div>
              <div><label className="label">Email</label><input type="email" className="input" value={newUserForm.email} onChange={e => setNewUserForm(f => ({ ...f, email: e.target.value }))} required /></div>
              <div><label className="label">Password</label><input type="password" className="input" value={newUserForm.password} onChange={e => setNewUserForm(f => ({ ...f, password: e.target.value }))} required /></div>
              <div><label className="label">Role</label>
                <select className="input" value={newUserForm.role} onChange={e => setNewUserForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="TECHNICIAN">Technician</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                  <option value="CLIENT">Client</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" disabled={createUserMutation.isPending}>{createUserMutation.isPending ? 'Inviting...' : 'Add Team Member'}</button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Ticket Categories</h2>
              <button onClick={openNewCat} className="btn-primary flex items-center gap-2 text-sm py-1.5">
                <Plus size={14} /> Add Category
              </button>
            </div>
            <div className="space-y-2">
              {categories.map((cat: any) => (
                <div key={cat.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm font-medium text-slate-800 flex-1">{cat.name}</span>
                  <span className="text-xs text-slate-400">{cat._count?.tickets || 0} tickets</span>
                  <button onClick={() => openEditCat(cat)} className="p-1.5 text-slate-400 hover:text-primary-600 rounded"><Pencil size={13} /></button>
                  <button onClick={() => { if (confirm(`Delete "${cat.name}"?`)) deleteCatMutation.mutate(cat.id) }} className="p-1.5 text-slate-400 hover:text-red-500 rounded"><Trash2 size={13} /></button>
                </div>
              ))}
              {categories.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No categories yet.</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sla' && (
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-semibold text-slate-900 mb-1">SLA Policies</h2>
            <p className="text-sm text-slate-500 mb-5">Define response and resolution time targets for each priority level.</p>
            <div className="space-y-4">
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(priority => (
                <div key={priority} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                  <div className="w-24 flex-shrink-0 pt-1">
                    <span className={`badge text-xs font-semibold ${priorityBadgeColors[priority]}`}>{priority}</span>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Response Time (min)</label>
                      <input
                        type="number"
                        min={1}
                        className="input"
                        value={slaPolicies[priority]?.responseTime ?? defaultSla[priority].responseTime}
                        onChange={e => setSlaPolicies(s => ({ ...s, [priority]: { ...s[priority], responseTime: Number(e.target.value) } }))}
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        {slaPolicies[priority]?.responseTime ?? defaultSla[priority].responseTime} min = {((slaPolicies[priority]?.responseTime ?? defaultSla[priority].responseTime) / 60).toFixed(1)} hours
                      </p>
                    </div>
                    <div>
                      <label className="label">Resolution Time (min)</label>
                      <input
                        type="number"
                        min={1}
                        className="input"
                        value={slaPolicies[priority]?.resolutionTime ?? defaultSla[priority].resolutionTime}
                        onChange={e => setSlaPolicies(s => ({ ...s, [priority]: { ...s[priority], resolutionTime: Number(e.target.value) } }))}
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        {slaPolicies[priority]?.resolutionTime ?? defaultSla[priority].resolutionTime} min = {((slaPolicies[priority]?.resolutionTime ?? defaultSla[priority].resolutionTime) / 60).toFixed(1)} hours
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 pt-6 flex items-center gap-2">
                    <button
                      onClick={() => saveSlaRow(priority)}
                      className="btn-primary text-sm py-1.5 px-3"
                    >
                      Save
                    </button>
                    {slaSaved[priority] && <span className="text-xs text-green-600 font-medium">Saved!</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Security</h2>
          <div className="space-y-4 max-w-md">
            <div><label className="label">New Password</label><input type="password" className="input" placeholder="••••••••" /></div>
            <div><label className="label">Confirm Password</label><input type="password" className="input" placeholder="••••••••" /></div>
            <button className="btn-primary">Update Password</button>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Notification Preferences</h2>
          <div className="space-y-3">
            {[
              { label: 'New ticket assigned to me', defaultChecked: true },
              { label: 'Ticket status changes', defaultChecked: true },
              { label: 'New comment on my tickets', defaultChecked: true },
              { label: 'Task due date reminders', defaultChecked: false },
              { label: 'Project updates', defaultChecked: false },
            ].map(item => (
              <label key={item.label} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked={item.defaultChecked} className="rounded" />
                <span className="text-sm text-slate-700">{item.label}</span>
              </label>
            ))}
          </div>
          <button className="btn-primary mt-4">Save Preferences</button>
        </div>
      )}

      {/* Category modal */}
      <Modal open={showCatModal} onClose={() => { setShowCatModal(false); setEditingCat(null) }} title={editingCat ? 'Edit Category' : 'New Category'} size="sm">
        <form onSubmit={e => { e.preventDefault(); catMutation.mutate(catForm) }} className="space-y-4">
          <div><label className="label">Name</label><input className="input" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Network, Hardware..." /></div>
          <div>
            <label className="label">Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={catForm.color} onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border border-slate-200" />
              <div className="flex gap-1.5 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setCatForm(f => ({ ...f, color: c }))}
                    className="w-6 h-6 rounded-full border-2 transition-all"
                    style={{ backgroundColor: c, borderColor: catForm.color === c ? '#0d9488' : 'transparent' }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setShowCatModal(false); setEditingCat(null) }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={catMutation.isPending}>{catMutation.isPending ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
