import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

const priorityColors: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

function ticketRef(number: number) {
  return `INC-${String(number).padStart(5, '0')}`
}

export default function TriagePage() {
  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets', 'AWAITING_TRIAGE'],
    queryFn: () => api.get('/tickets', { params: { status: 'AWAITING_TRIAGE' } }).then(r => r.data),
    refetchInterval: 30000,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Triage Queue</h1>
          <p className="text-sm text-slate-500">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} awaiting triage</p>
        </div>
      </div>

      {tickets.length === 0 ? (
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
              {tickets.map((ticket: any) => (
                <tr key={ticket.id} className="border-b border-slate-50 hover:bg-violet-50/40 transition-colors">
                  <td className="py-3 px-4">
                    <Link to={`/tickets/${ticket.id}`} className="text-xs font-mono font-semibold text-primary-600 hover:text-primary-700">
                      {ticketRef(ticket.number)}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <Link to={`/tickets/${ticket.id}`} className="text-sm font-medium text-slate-800 hover:text-primary-600 transition-colors line-clamp-1 max-w-[280px] block">
                      {ticket.title}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                    {ticket.createdBy ? `${ticket.createdBy.firstName} ${ticket.createdBy.lastName}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{ticket.company?.name || '—'}</td>
                  <td className="py-3 px-4">
                    <span className={clsx('badge text-xs', priorityColors[ticket.priority])}>{ticket.priority}</span>
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
