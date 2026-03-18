import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Link } from 'react-router-dom'
import { Plus, Search, Ticket } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import Modal from '@/components/ui/Modal'
import { useAuthStore } from '@/store/authStore'

const priorityColors: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}
const statusColors: Record<string, string> = {
  AWAITING_TRIAGE: 'bg-violet-100 text-violet-700',
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-orange-100 text-orange-700',
  WAITING_CLIENT: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-600',
}

function ticketRef(number: number) {
  return `INC-${String(number).padStart(5, '0')}`
}

function getSlaInfo(ticket: any): { status: 'ok' | 'warning' | 'breached' | 'none'; timeLeft: string } {
  if (!ticket.slaResolutionDue || ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
    return { status: 'none', timeLeft: '' }
  }
  const now = Date.now()
  const due = new Date(ticket.slaResolutionDue).getTime()
  const created = new Date(ticket.createdAt).getTime()
  const totalMs = due - created
  const remainingMs = due - now

  if (remainingMs < 0) {
    const overMs = -remainingMs
    const h = Math.floor(overMs / 3600000)
    const m = Math.floor((overMs % 3600000) / 60000)
    return { status: 'breached', timeLeft: h > 0 ? `${h}h ${m}m over` : `${m}m over` }
  }
  const h = Math.floor(remainingMs / 3600000)
  const m = Math.floor((remainingMs % 3600000) / 60000)
  const timeLeft = h > 0 ? `${h}h ${m}m` : `${m}m`
  return {
    status: remainingMs / totalMs < 0.2 ? 'warning' : 'ok',
    timeLeft,
  }
}

const slaBadgeStyles: Record<string, string> = {
  ok: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  breached: 'bg-red-100 text-red-700',
}

export default function TicketsPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', priority: 'MEDIUM', categoryId: '', companyId: '', assignedToId: '',
  })

  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets', statusFilter, categoryFilter, search],
    queryFn: () => api.get('/tickets', { params: { status: statusFilter || undefined, categoryId: categoryFilter || undefined, search: search || undefined } }).then(r => r.data),
  })
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/tickets', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] })
      setShowModal(false)
      setForm({ title: '', description: '', priority: 'MEDIUM', categoryId: '', companyId: '', assignedToId: '' })
    },
  })

  const statusCounts: Record<string, number> = tickets.reduce((acc: any, t: any) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
          <p className="text-sm text-slate-500">{tickets.length} total tickets</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {/* Status summary pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: '', label: 'All', count: tickets.length },
          { key: 'AWAITING_TRIAGE', label: 'Triage', count: statusCounts['AWAITING_TRIAGE'] || 0 },
          { key: 'OPEN', label: 'Open', count: statusCounts['OPEN'] || 0 },
          { key: 'IN_PROGRESS', label: 'In Progress', count: statusCounts['IN_PROGRESS'] || 0 },
          { key: 'WAITING_CLIENT', label: 'Waiting Client', count: statusCounts['WAITING_CLIENT'] || 0 },
          { key: 'RESOLVED', label: 'Resolved', count: statusCounts['RESOLVED'] || 0 },
          { key: 'CLOSED', label: 'Closed', count: statusCounts['CLOSED'] || 0 },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              statusFilter === s.key ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            )}
          >
            {s.label}
            <span className={clsx('text-xs px-1.5 py-0.5 rounded-full', statusFilter === s.key ? 'bg-white/20' : 'bg-slate-100')}>
              {s.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 max-w-xs">
          <Search size={15} className="text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..." className="text-sm outline-none flex-1 text-slate-700" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input w-auto text-sm">
          <option value="">All Categories</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Ticket table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 w-28">Ref</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Title</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Reporter</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Company</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Category</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Priority</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">SLA</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Status</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Assigned To</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Created</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket: any) => (
              <tr key={ticket.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4">
                  <Link to={`/tickets/${ticket.id}`} className="text-xs font-mono font-semibold text-primary-600 hover:text-primary-700">
                    {ticketRef(ticket.number)}
                  </Link>
                </td>
                <td className="py-3 px-4">
                  <Link to={`/tickets/${ticket.id}`} className="text-sm font-medium text-slate-800 hover:text-primary-600 transition-colors line-clamp-1 max-w-[200px] block">
                    {ticket.title}
                  </Link>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                  {ticket.createdBy ? `${ticket.createdBy.firstName} ${ticket.createdBy.lastName}` : '—'}
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{ticket.company?.name || '—'}</td>
                <td className="py-3 px-4">
                  {ticket.category ? (
                    <span className="badge text-xs font-medium" style={{ backgroundColor: ticket.category.color + '20', color: ticket.category.color }}>
                      {ticket.category.name}
                    </span>
                  ) : <span className="text-slate-400 text-xs">—</span>}
                </td>
                <td className="py-3 px-4">
                  <span className={clsx('badge text-xs', priorityColors[ticket.priority])}>{ticket.priority}</span>
                </td>
                <td className="py-3 px-4">
                  {(() => {
                    const sla = getSlaInfo(ticket)
                    if (sla.status === 'none') return <span className="text-slate-400 text-xs">—</span>
                    return (
                      <div className="flex flex-col gap-0.5">
                        <span className={clsx('badge text-xs font-medium', slaBadgeStyles[sla.status])}>
                          {sla.status === 'breached' ? 'Breached' : sla.status === 'warning' ? 'At Risk' : 'In SLA'}
                        </span>
                        <span className="text-xs text-slate-400">{sla.timeLeft}</span>
                      </div>
                    )
                  })()}
                </td>
                <td className="py-3 px-4">
                  <span className={clsx('badge text-xs', statusColors[ticket.status])}>{ticket.status.replace(/_/g, ' ')}</span>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                  {ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : <span className="text-slate-400">Unassigned</span>}
                </td>
                <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr><td colSpan={10} className="py-12 text-center text-slate-400">
                <Ticket size={32} className="mx-auto mb-2 opacity-30" />
                No tickets found
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Ticket">
        <form onSubmit={e => {
          e.preventDefault()
          createMutation.mutate({
            ...form,
            categoryId: form.categoryId || undefined,
            companyId: form.companyId || undefined,
            assignedToId: form.assignedToId || undefined,
          })
        }} className="space-y-4">
          <div>
            <label className="label">Title <span className="text-red-500">*</span></label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Brief description of the issue" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input h-24 resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detailed description..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                <option value="">Select category</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Company</label>
              <select className="input" value={form.companyId} onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))}>
                <option value="">None</option>
                {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Assign To</label>
              <select className="input" value={form.assignedToId} onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}>
                <option value="">Unassigned</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
