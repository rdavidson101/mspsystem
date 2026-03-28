import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCurrency } from '@/lib/useCurrency'
import { Plus, FileText, Search } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import Modal from '@/components/ui/Modal'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  ACTIVE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-orange-100 text-orange-700',
}

export default function ContractsPage() {
  const qc = useQueryClient()
  const { symbol, fmt } = useCurrency()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', status: 'DRAFT', companyId: '', value: '', startDate: '', endDate: '', billingCycle: 'Monthly' })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [billingFilter, setBillingFilter] = useState('')

  const { data: contracts = [] } = useQuery({ queryKey: ['contracts'], queryFn: () => api.get('/contracts').then(r => r.data) })
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/contracts', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); setShowModal(false) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/contracts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  })

  const totalValue = contracts.filter((c: any) => c.status === 'ACTIVE').reduce((s: number, c: any) => s + c.value, 0)

  const filteredContracts = contracts.filter((c: any) =>
    (!search || c.name.toLowerCase().includes(search.toLowerCase()) || c.company?.name?.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || c.status === statusFilter) &&
    (!billingFilter || c.billingCycle === billingFilter)
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contracts</h1>
          <p className="text-sm text-slate-500">{contracts.length} contracts</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Contract
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4"><p className="text-xs text-slate-500 mb-1">Active Contracts</p><p className="text-2xl font-bold text-green-600">{contracts.filter((c: any) => c.status === 'ACTIVE').length}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500 mb-1">Total Active Value</p><p className="text-2xl font-bold text-slate-900">{fmt(totalValue)}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500 mb-1">Expiring Soon</p><p className="text-2xl font-bold text-orange-500">{contracts.filter((c: any) => c.status === 'ACTIVE' && new Date(c.endDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length}</p></div>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="input pl-9 text-sm w-full" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input text-sm w-auto">
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select value={billingFilter} onChange={e => setBillingFilter(e.target.value)} className="input text-sm w-auto">
          <option value="">All billing cycles</option>
          <option value="Monthly">Monthly</option>
          <option value="Quarterly">Quarterly</option>
          <option value="Annual">Annual</option>
          <option value="One-time">One-time</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Contract</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Company</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Value</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Billing</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Start</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">End</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredContracts.map((contract: any) => (
              <tr key={contract.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4"><p className="text-sm font-medium text-slate-800">{contract.name}</p><p className="text-xs text-slate-400">{contract.description}</p></td>
                <td className="py-3 px-4 text-sm text-slate-600">{contract.company?.name}</td>
                <td className="py-3 px-4 text-sm font-medium text-slate-800">{fmt(contract.value)}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{contract.billingCycle || '—'}</td>
                <td className="py-3 px-4 text-xs text-slate-500">{format(new Date(contract.startDate), 'MMM d, yyyy')}</td>
                <td className="py-3 px-4 text-xs text-slate-500">{format(new Date(contract.endDate), 'MMM d, yyyy')}</td>
                <td className="py-3 px-4">
                  <select value={contract.status} onChange={e => updateMutation.mutate({ id: contract.id, status: e.target.value })} className={clsx('badge text-xs border-0 cursor-pointer', statusColors[contract.status])}>
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
            {filteredContracts.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-slate-400"><FileText size={32} className="mx-auto mb-2 opacity-30" />{contracts.length === 0 ? 'No contracts yet' : 'No contracts match your filters'}</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Contract">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ ...form, value: Number(form.value) }) }} className="space-y-4">
          <div><label className="label">Contract Name</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
          <div><label className="label">Description</label><textarea className="input h-16 resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Company</label>
              <SearchableSelect
                value={form.companyId}
                onChange={val => setForm(f => ({ ...f, companyId: val }))}
                options={companies.map((c: any) => ({ value: c.id, label: c.name }))}
                placeholder="Select company"
                emptyLabel="None"
              />
            </div>
            <div><label className="label">Value ({symbol})</label><input type="number" className="input" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Start Date</label><input type="date" className="input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required /></div>
            <div><label className="label">End Date</label><input type="date" className="input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Billing Cycle</label><select className="input" value={form.billingCycle} onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value }))}><option>Monthly</option><option>Quarterly</option><option>Annual</option><option>One-time</option></select></div>
            <div><label className="label">Status</label><select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option></select></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Create Contract'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
