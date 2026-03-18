import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Tag, Clock, Plus, Pencil, Trash2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import clsx from 'clsx'

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
  const [activeTab, setActiveTab] = useState<'categories' | 'sla'>('categories')

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
