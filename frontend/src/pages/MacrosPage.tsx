import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, Zap, Pencil, Trash2, X, Search } from 'lucide-react'
import Modal from '@/components/ui/Modal'

const VARIABLES = ['{{requester_name}}', '{{ticket_ref}}', '{{current_user}}', '{{company_name}}', '{{priority}}']

export default function MacrosPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name: '', content: '', isGlobal: true })

  const { data: rawMacros = [] } = useQuery({ queryKey: ['macros'], queryFn: () => api.get('/macros').then(r => r.data) })

  const macros = rawMacros.filter((m: any) => {
    const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.content.toLowerCase().includes(search.toLowerCase())
    const matchesType = !typeFilter || (typeFilter === 'global' ? m.isGlobal : !m.isGlobal)
    return matchesSearch && matchesType
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => editing ? api.put(`/macros/${editing.id}`, data) : api.post('/macros', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['macros'] }); closeModal() },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/macros/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['macros'] }),
  })

  function openCreate() { setEditing(null); setForm({ name: '', content: '', isGlobal: true }); setShowModal(true) }
  function openEdit(macro: any) { setEditing(macro); setForm({ name: macro.name, content: macro.content, isGlobal: macro.isGlobal }); setShowModal(true) }
  function closeModal() { setShowModal(false); setEditing(null) }
  function insertVar(v: string) { setForm(f => ({ ...f, content: f.content + v })) }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap size={24} className="text-primary-600" /> Macros
          </h1>
          <p className="text-sm text-slate-500">Canned responses for common ticket replies</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Macro
        </button>
      </div>

      {/* Search / filter */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="input pl-9 text-sm w-full" />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="input text-sm max-w-[160px]"
        >
          <option value="">All types</option>
          <option value="global">Global</option>
          <option value="personal">Personal</option>
        </select>
      </div>

      {/* Variable reference */}
      <div className="card p-4 bg-slate-50">
        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Available Variables</p>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map(v => (
            <code key={v} className="text-xs bg-white border border-slate-200 text-primary-600 px-2 py-1 rounded font-mono">{v}</code>
          ))}
        </div>
      </div>

      {/* Macro list */}
      <div className="space-y-3">
        {macros.map((macro: any) => (
          <div key={macro.id} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900">{macro.name}</h3>
                  <span className={`badge text-xs ${macro.isGlobal ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {macro.isGlobal ? 'Global' : 'Personal'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-2">By {macro.createdBy?.firstName} {macro.createdBy?.lastName}</p>
                <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans bg-slate-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {macro.content}
                </pre>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEdit(macro)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                  <Pencil size={15} />
                </button>
                <button onClick={() => { if (confirm('Delete this macro?')) deleteMutation.mutate(macro.id) }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {macros.length === 0 && (
          <div className="card p-12 text-center text-slate-400">
            <Zap size={40} className="mx-auto mb-2 opacity-30" />
            <p className="font-medium">No macros yet</p>
            <p className="text-sm mt-1">Create canned responses to speed up ticket replies</p>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={closeModal} title={editing ? 'Edit Macro' : 'New Macro'} size="lg">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form) }} className="space-y-4">
          <div>
            <label className="label">Macro Name</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Initial Response" required />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Content</label>
              <div className="flex gap-1 flex-wrap justify-end">
                {VARIABLES.map(v => (
                  <button key={v} type="button" onClick={() => insertVar(v)} className="text-xs bg-primary-50 text-primary-600 hover:bg-primary-100 px-2 py-0.5 rounded font-mono transition-colors">
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              className="input font-mono text-sm h-40 resize-none"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Hi {{requester_name}}, ..."
              required
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isGlobal} onChange={e => setForm(f => ({ ...f, isGlobal: e.target.checked }))} className="rounded" />
            <span className="text-sm text-slate-700">Available to all users</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create Macro'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
