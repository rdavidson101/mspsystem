import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ticketRef } from '@/lib/refs'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/store/authStore'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

const priorityColors: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

export default function TriagePage() {
  const { user } = useAuthStore()
  const [teamFilter, setTeamFilter] = useState<string>(() => '')
  const [priorityFilter, setPriorityFilter] = useState('')

  const { data: teams = [] } = useQuery({ queryKey: ['teams'], queryFn: () => api.get('/teams').then(r => r.data) })
  const { data: myTeams = [] } = useQuery({ queryKey: ['my-teams'], queryFn: () => api.get('/auth/me/teams').then(r => r.data) })

  useEffect(() => {
    if ((myTeams as any[]).length > 0 && !teamFilter) setTeamFilter((myTeams as any[])[0].id)
  }, [myTeams])

  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets', 'AWAITING_TRIAGE', teamFilter],
    queryFn: () => api.get('/tickets', { params: { status: 'AWAITING_TRIAGE', serviceTeamId: teamFilter || undefined } }).then(r => r.data),
    refetchInterval: 30000,
  })

  const filtered = (tickets as any[]).filter(t => !priorityFilter || t.priority === priorityFilter)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Triage Queue</h1>
          <p className="text-sm text-slate-500">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} awaiting triage</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="input text-sm w-auto">
            <option value="">All priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <SearchableSelect
            value={teamFilter}
            onChange={val => setTeamFilter(val)}
            options={(teams as any[]).map((t: any) => ({ value: t.id, label: t.name }))}
            placeholder="All Teams"
            emptyLabel="All Teams"
            className="w-48"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={24} className="text-green-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">Queue is clear</h3>
          <p className="text-sm text-slate-400">No tickets awaiting triage right now.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 w-28">Ref</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Title</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Reporter</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Company</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Priority</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Category</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Received</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket: any) => (
                <tr key={ticket.id} className="border-b border-slate-50 hover:bg-violet-50/40 transition-colors">
                  <td className="py-3 px-4">
                    <Link to={`/tickets/${ticketRef(ticket.number)}`} className="text-xs font-mono font-semibold text-primary-600 hover:text-primary-700">
                      {ticketRef(ticket.number)}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <Link to={`/tickets/${ticketRef(ticket.number)}`} className="text-sm font-medium text-slate-800 hover:text-primary-600 transition-colors line-clamp-1 max-w-[280px] block">
                      {ticket.title}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                    {(() => { const r = ticket.createdBy ?? ticket.contact; return r ? `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || '—' : '—' })()}
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
                    {ticket.category ? (
                      <span className="badge text-xs font-medium" style={{ backgroundColor: ticket.category.color + '20', color: ticket.category.color }}>
                        {ticket.category.name}
                      </span>
                    ) : <span className="text-xs text-slate-400">Not set</span>}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
                    {format(new Date(ticket.createdAt), 'MMM d, h:mm a')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
