import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ticketRef } from '@/lib/refs'
import { Link } from 'react-router-dom'
import { Search, Ticket } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
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
  return { status: remainingMs / totalMs < 0.2 ? 'warning' : 'ok', timeLeft }
}

const slaBadgeStyles: Record<string, string> = {
  ok: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  breached: 'bg-red-100 text-red-700',
}

export default function MyTicketsPage() {
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: tickets = [] } = useQuery({
    queryKey: ['my-tickets', statusFilter, search],
    queryFn: () => api.get('/tickets', {
      params: {
        assignedToId: user?.id,
        status: statusFilter || undefined,
        search: search || undefined,
      },
    }).then(r => r.data),
    enabled: !!user?.id,
  })

  const statusCounts: Record<string, number> = tickets.reduce((acc: any, t: any) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Tickets</h1>
          <p className="text-sm text-slate-500">Tickets assigned to you — {tickets.length} total</p>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: '', label: 'All', count: tickets.length },
          { key: 'OPEN', label: 'Open', count: statusCounts['OPEN'] || 0 },
          { key: 'IN_PROGRESS', label: 'In Progress', count: statusCounts['IN_PROGRESS'] || 0 },
          { key: 'WAITING_CLIENT', label: 'Waiting Client', count: statusCounts['WAITING_CLIENT'] || 0 },
          { key: 'RESOLVED', label: 'Resolved', count: statusCounts['RESOLVED'] || 0 },
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

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 max-w-xs">
        <Search size={15} className="text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tickets..."
          className="text-sm outline-none flex-1 text-slate-700"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 w-28">Ref</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Title</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Company</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Category</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Priority</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">SLA</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Status</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Created</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket: any) => (
              <tr key={ticket.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4">
                  <Link to={`/tickets/${ticketRef(ticket.number)}`} className="text-xs font-mono font-semibold text-primary-600 hover:text-primary-700">
                    {ticketRef(ticket.number)}
                  </Link>
                </td>
                <td className="py-3 px-4">
                  <Link to={`/tickets/${ticketRef(ticket.number)}`} className="text-sm font-medium text-slate-800 hover:text-primary-600 transition-colors line-clamp-1 max-w-[240px] block">
                    {ticket.title}
                  </Link>
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
                  <div className="flex flex-wrap gap-1">
                    <span className={clsx('badge text-xs', priorityColors[ticket.priority])}>{ticket.priority}</span>
                    {ticket.serviceTeam && (
                      <span className="badge text-xs bg-indigo-50 text-indigo-700 border border-indigo-100">{ticket.serviceTeam.name}</span>
                    )}
                  </div>
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
                <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr><td colSpan={8} className="py-12 text-center text-slate-400">
                <Ticket size={32} className="mx-auto mb-2 opacity-30" />
                No tickets assigned to you
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
