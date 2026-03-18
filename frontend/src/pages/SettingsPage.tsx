import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { User, Users, Shield, Bell } from 'lucide-react'

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('profile')
  const [profileForm, setProfileForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', email: user?.email || '', phone: '' })
  const [saved, setSaved] = useState(false)

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) })

  const [newUserForm, setNewUserForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'TECHNICIAN' })

  const createUserMutation = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setNewUserForm({ firstName: '', lastName: '', email: '', password: '', role: 'TECHNICIAN' }) },
  })

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    await api.put(`/users/${user?.id}`, profileForm)
    updateUser(profileForm)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
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
              <div><label className="label">Role</label><select className="input" value={newUserForm.role} onChange={e => setNewUserForm(f => ({ ...f, role: e.target.value }))}><option value="TECHNICIAN">Technician</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option><option value="CLIENT">Client</option></select></div>
              <button type="submit" className="btn-primary" disabled={createUserMutation.isPending}>{createUserMutation.isPending ? 'Inviting...' : 'Add Team Member'}</button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Security</h2>
          <div className="space-y-4 max-w-md">
            <p className="text-sm text-slate-600">Change your password below.</p>
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
    </div>
  )
}
