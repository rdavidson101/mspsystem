import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, TrendingUp, DollarSign, Search } from 'lucide-react'
import clsx from 'clsx'
import Modal from '@/components/ui/Modal'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

const stages = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']
const stageColors: Record<string, string> = {
  NEW: 'bg-slate-100 text-slate-600',
  CONTACTED: 'bg-blue-100 text-blue-700',
  QUALIFIED: 'bg-indigo-100 text-indigo-700',
  PROPOSAL: 'bg-purple-100 text-purple-700',
  NEGOTIATION: 'bg-orange-100 text-orange-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
}

export default function LeadsPage() {
  const qc = useQueryClient()
  const [stageFilter, setStageFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', value: '', status: 'NEW', source: '', companyId: '' })

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', stageFilter],
    queryFn: () => api.get('/leads').then(r => r.data),
  })
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/leads', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); setShowModal(false) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/leads/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })

  const filtered = leads.filter((l: any) =>
    (!stageFilter || l.status === stageFilter) &&
    (!search || l.title?.toLowerCase().includes(search.toLowerCase()) || l.company?.name?.toLowerCase().includes(search.toLowerCase()))
  )
  const totalValue = leads.filter((l: any) => l.status === 'WON').reduce((s: number, l: any) => s + (l.value || 0), 0)
  const pipelineValue = leads.filter((l: any) => !['WON', 'LOST'].includes(l.status)).reduce((s: number, l: any) => s + (l.value || 0), 0)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500">{leads.length} total leads</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Lead
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Total Pipeline Value</p>
          <p className="text-2xl font-bold text-slate-900">${pipelineValue.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Won Value</p>
          <p className="text-2xl font-bold text-green-600">${totalValue.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Active Leads</p>
          <p className="text-2xl font-bold text-primary-600">{leads.filter((l: any) => !['WON', 'LOST'].includes(l.status)).length}</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="input pl-9 text-sm w-full" />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setStageFilter('')} className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', !stageFilter ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>All</button>
        {stages.map(s => (
          <button key={s} onClick={() => setStageFilter(s)} className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', stageFilter === s ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>{s}</button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Title</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Company</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Value</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Source</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Stage</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead: any) => (
              <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-sm font-medium text-slate-800">{lead.title}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{lead.company?.name || '—'}</td>
                <td className="py-3 px-4 text-sm font-medium text-slate-800">{lead.value ? `$${lead.value.toLocaleString()}` : '—'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{lead.source || '—'}</td>
                <td className="py-3 px-4">
                  <select value={lead.status} onChange={e => updateMutation.mutate({ id: lead.id, status: e.target.value })} className={clsx('badge text-xs border-0 cursor-pointer', stageColors[lead.status])}>
                    {stages.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-slate-400"><TrendingUp size={32} className="mx-auto mb-2 opacity-30" />No leads found</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Lead">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ ...form, value: form.value ? Number(form.value) : undefined, companyId: form.companyId || undefined }) }} className="space-y-4">
          <div><label className="label">Title</label><input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Value ($)</label><input type="number" className="input" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></div>
            <div><label className="label">Stage</label><select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{stages.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Source</label><input className="input" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="Website, Referral..." /></div>
            <div>
              <label className="label">Company</label>
              <SearchableSelect
                value={form.companyId}
                onChange={val => setForm(f => ({ ...f, companyId: val }))}
                options={companies.map((c: any) => ({ value: c.id, label: c.name }))}
                placeholder="None"
                emptyLabel="None"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Create Lead'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
