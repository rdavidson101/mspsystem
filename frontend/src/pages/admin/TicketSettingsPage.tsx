import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Tag, Clock, Plus, Pencil, Trash2, Users, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import clsx from 'clsx'
import UserAvatar from '@/components/ui/UserAvatar'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

const PRESET_COLORS = ['#3b82f6','#f97316','#8b5cf6','#06b6d4','#ef4444','#10b981','#f59e0b','#ec4899','#6366f1','#14b8a6']

const defaultSla: Record<string, { responseTime: number; resolutionTime: number }> = {
  LOW: { responseTime: 480, resolutionTime: 2880 },
  MEDIUM: { responseTime: 240, resolutionTime: 1440 },
  HIGH: { responseTime: 60, resolutionTime: 480 },
  CRITICAL: { responseTime: 15, resolutionTime: 120 },
}

const priorityBadgeColors: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

export default function TicketSettingsPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'categories' | 'sla' | 'teams'>('categories')

  // Categories state
  const [showCatModal, setShowCatModal] = useState(false)
  const [editingCat, setEditingCat] = useState<any>(null)
  const [catForm, setCatForm] = useState({ name: '', color: '#6366f1' })

  // SLA state
  const [slaPolicies, setSlaPolicies] = useState<Record<string, { responseTime: number; resolutionTime: number }>>(defaultSla)
  const [slaSaved, setSlaSaved] = useState<Record<string, boolean>>({})

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data),
  })

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

  const catMutation = useMutation({
    mutationFn: (data: any) => editingCat
      ? api.put(`/categories/${editingCat.id}`, data)
      : api.post('/categories', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setShowCatModal(false)
      setEditingCat(null)
    },
  })

  const deleteCatMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })

  async function saveSlaRow(priority: string) {
    await api.put('/sla', { priority, ...slaPolicies[priority] })
    setSlaSaved(s => ({ ...s, [priority]: true }))
    setTimeout(() => setSlaSaved(s => ({ ...s, [priority]: false })), 2000)
  }

  function openEditCat(cat: any) {
    setEditingCat(cat)
    setCatForm({ name: cat.name, color: cat.color })
    setShowCatModal(true)
  }

  function openNewCat() {
    setEditingCat(null)
    setCatForm({ name: '', color: '#6366f1' })
    setShowCatModal(true)
  }

  const tabs = [
    { id: 'categories' as const, label: 'Categories', icon: Tag },
    { id: 'sla' as const, label: 'SLA Policies', icon: Clock },
    { id: 'teams' as const, label: 'Service Teams', icon: Users },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Ticket Settings</h1>
        <p className="text-sm text-slate-500">Manage ticket categories and SLA policies.</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'categories' && (
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
                <button onClick={() => openEditCat(cat)} className="p-1.5 text-slate-400 hover:text-primary-600 rounded">
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => { if (confirm(`Delete "${cat.name}"?`)) deleteCatMutation.mutate(cat.id) }}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No categories yet.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sla' && (
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-1">SLA Policies</h2>
          <p className="text-sm text-slate-500 mb-5">Define response and resolution time targets for each priority level.</p>
          <div className="space-y-4">
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(priority => (
              <div key={priority} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="w-24 flex-shrink-0 pt-1">
                  <span className={clsx('badge text-xs font-semibold', priorityBadgeColors[priority])}>{priority}</span>
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
                  <button onClick={() => saveSlaRow(priority)} className="btn-primary text-sm py-1.5 px-3">
                    Save
                  </button>
                  {slaSaved[priority] && <span className="text-xs text-green-600 font-medium">Saved!</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'teams' && (
        <TeamsTab />
      )}

      {/* Category modal */}
      <Modal
        open={showCatModal}
        onClose={() => { setShowCatModal(false); setEditingCat(null) }}
        title={editingCat ? 'Edit Category' : 'New Category'}
        size="sm"
      >
        <form onSubmit={e => { e.preventDefault(); catMutation.mutate(catForm) }} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={catForm.name}
              onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
              required
              placeholder="e.g. Network, Hardware..."
            />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={catForm.color}
                onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))}
                className="w-10 h-10 rounded cursor-pointer border border-slate-200"
              />
              <div className="flex gap-1.5 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCatForm(f => ({ ...f, color: c }))}
                    className="w-6 h-6 rounded-full border-2 transition-all"
                    style={{ backgroundColor: c, borderColor: catForm.color === c ? '#0d9488' : 'transparent' }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setShowCatModal(false); setEditingCat(null) }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={catMutation.isPending}>
              {catMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function TeamsTab() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<any>(null)
  const [teamForm, setTeamForm] = useState({ name: '', description: '' })
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null)
  const [memberUserId, setMemberUserId] = useState('')

  const { data: teams = [] } = useQuery({ queryKey: ['teams'], queryFn: () => api.get('/teams').then(r => r.data) })
  const { data: internalUsers = [] } = useQuery({ queryKey: ['users', 'INTERNAL'], queryFn: () => api.get('/users', { params: { type: 'INTERNAL' } }).then(r => r.data) })

  const teamMutation = useMutation({
    mutationFn: (data: any) => editingTeam ? api.put(`/teams/${editingTeam.id}`, data) : api.post('/teams', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); setShowModal(false); setEditingTeam(null) }
  })
  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/teams/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] })
  })
  const addMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: any) => api.post(`/teams/${teamId}/members`, { userId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); setAddMemberTeamId(null); setMemberUserId('') }
  })
  const removeMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: any) => api.delete(`/teams/${teamId}/members/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] })
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Service Desk Teams</h2>
          <p className="text-sm text-slate-500 mt-0.5">Assign users to teams and link teams to customers for automatic ticket routing.</p>
        </div>
        <button onClick={() => { setEditingTeam(null); setTeamForm({ name: '', description: '' }); setShowModal(true) }} className="btn-primary flex items-center gap-2 text-sm py-1.5">
          <Plus size={14} /> New Team
        </button>
      </div>

      {(teams as any[]).length === 0 && (
        <div className="card p-10 text-center text-slate-400">
          <p className="font-medium">No service teams yet</p>
          <p className="text-sm mt-1">Create a team to start routing tickets automatically</p>
        </div>
      )}

      {(teams as any[]).map((team: any) => (
        <div key={team.id} className="card p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">{team.name}</h3>
              {team.description && <p className="text-sm text-slate-500 mt-0.5">{team.description}</p>}
              <p className="text-xs text-slate-400 mt-1">{team._count?.tickets || 0} tickets · {team._count?.companies || 0} customers</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setEditingTeam(team); setTeamForm({ name: team.name, description: team.description || '' }); setShowModal(true) }} className="p-1.5 text-slate-400 hover:text-primary-600 rounded"><Pencil size={13} /></button>
              <button onClick={() => { if (confirm(`Delete team "${team.name}"?`)) deleteTeamMutation.mutate(team.id) }} className="p-1.5 text-slate-400 hover:text-red-500 rounded"><Trash2 size={13} /></button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Members</p>
            {team.members.map((m: any) => (
              <div key={m.id} className="flex items-center gap-2">
                <UserAvatar user={m.user} size="xs" showHoverCard={false} />
                <span className="text-sm text-slate-700 flex-1">{m.user.firstName} {m.user.lastName}</span>
                {m.user.jobTitle && <span className="text-xs text-slate-400">{m.user.jobTitle}</span>}
                <button onClick={() => removeMemberMutation.mutate({ teamId: team.id, userId: m.userId })} className="p-1 text-slate-300 hover:text-red-500 rounded"><X size={12} /></button>
              </div>
            ))}
            {team.members.length === 0 && <p className="text-xs text-slate-400 italic">No members yet</p>}

            {addMemberTeamId === team.id ? (
              <div className="flex gap-2 mt-2">
                <SearchableSelect
                  value={memberUserId}
                  onChange={val => setMemberUserId(val)}
                  options={(internalUsers as any[]).filter((u: any) => !team.members.some((m: any) => m.userId === u.id)).map((u: any) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))}
                  placeholder="Select user…"
                  emptyLabel="None"
                  className="flex-1"
                />
                <button disabled={!memberUserId} onClick={() => addMemberMutation.mutate({ teamId: team.id, userId: memberUserId })} className="btn-primary text-sm py-1.5 disabled:opacity-50">Add</button>
                <button onClick={() => setAddMemberTeamId(null)} className="btn-secondary text-sm py-1.5">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setAddMemberTeamId(team.id)} className="text-xs text-primary-600 hover:text-primary-700 font-medium mt-1">+ Add member</button>
            )}
          </div>
        </div>
      ))}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditingTeam(null) }} title={editingTeam ? 'Edit Team' : 'New Team'} size="sm">
        <form onSubmit={e => { e.preventDefault(); teamMutation.mutate(teamForm) }} className="space-y-4">
          <div>
            <label className="label">Team Name</label>
            <input className="input" value={teamForm.name} onChange={e => setTeamForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Level 1 Support" />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={teamForm.description} onChange={e => setTeamForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditingTeam(null) }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={teamMutation.isPending}>{teamMutation.isPending ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
