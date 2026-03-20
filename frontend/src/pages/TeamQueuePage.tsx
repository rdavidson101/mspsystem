import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ticketRef } from '@/lib/refs'
import { useParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Users } from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'

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

const PAGE_SIZE = 20

export default function TeamQueuePage() {
  const { id } = useParams<{ id: string }>()
  const [statusFilter, setStatusFilter] = useState('active')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(0)

  const { data: team } = useQuery({
    queryKey: ['team', id],
    queryFn: () => api.get(`/teams/${id}`).then(r => r.data),
    enabled: !!id,
  })

  const { data: tickets = [], isFetching } = useQuery({
    queryKey: ['team-tickets', id, statusFilter],
    queryFn: () => api.get('/tickets', { params: {
      serviceTeamId: id,
      ...(statusFilter === 'active' ? { active: 'true' } : statusFilter ? { status: statusFilter } : {}),
    }}).then(r => r.data),
    enabled: !!id,
    refetchInterval: 30000,
  })

  const filtered = (tickets as any[]).filter(t => !priorityFilter || t.priority === priorityFilter)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users size={20} className="text-primary-600" />
            <h1 className="text-2xl font-bold text-slate-900">{team?.name || 'Team Queue'}</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {team?.members?.length || 0} members · {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(0) }} className="input text-sm w-auto">
            <option value="">All priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'active', label: 'Active' },
              { key: '', label: 'All' },
              { key: 'AWAITING_TRIAGE', label: 'Triage' },
              { key: 'OPEN', label: 'Open' },
              { key: 'IN_PROGRESS', label: 'In Progress' },
              { key: 'RESOLVED', label: 'Resolved' },
              { key: 'CLOSED', label: 'Closed' },
            ].map(s => (
              <button key={s.key} onClick={() => { setStatusFilter(s.key); setPage(0) }}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  statusFilter === s.key ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                )}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 && !isFetching ? (
        <div className="card p-14 text-center text-slate-400">
          <Users size={36} className="mx-auto mb-2 opacity-20" />
          <p className="font-medium">No tickets in this queue</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 w-28">Ref</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Title</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Customer</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Priority</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Assigned To</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Raised</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((ticket: any) => (
                <tr key={ticket.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <Link to={`/tickets/${ticketRef(ticket.number)}`} className="text-xs font-mono font-semibold text-primary-600 hover:text-primary-700">
                      {ticketRef(ticket.number)}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <Link to={`/tickets/${ticketRef(ticket.number)}`} className="text-sm font-medium text-slate-800 hover:text-primary-600 line-clamp-1 max-w-[240px] block">
                      {ticket.title}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{ticket.company?.name || '—'}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      <span className={clsx('badge text-xs', priorityColors[ticket.priority])}>{ticket.priority}</span>
                      {ticket.serviceTeam && (
                        <span className="badge text-xs bg-indigo-50 text-indigo-700 border border-indigo-100">{ticket.serviceTeam.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={clsx('badge text-xs', statusColors[ticket.status])}>{ticket.status.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                    {ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : <span className="text-slate-400">Unassigned</span>}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
                    {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">Page {page + 1} of {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">← Prev</button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Next →</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
