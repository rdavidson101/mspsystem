import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ticketRef } from '@/lib/refs'
import { Link } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { format } from 'date-fns'
import clsx from 'clsx'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

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

export default function TicketSearchPage() {
  const [filters, setFilters] = useState({
    search: '',
    companyId: '',
    createdById: '',
    assignedToId: '',
    status: '',
    createdAtFrom: '',
    createdAtTo: '',
    resolvedAtFrom: '',
    resolvedAtTo: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [page, setPage] = useState(0)

  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) })

  const buildParams = () => {
    const p: any = {}
    if (filters.search) p.search = filters.search
    if (filters.companyId) p.companyId = filters.companyId
    if (filters.createdById) p.createdById = filters.createdById
    if (filters.assignedToId) p.assignedToId = filters.assignedToId
    if (filters.status) p.status = filters.status
    if (filters.createdAtFrom) p.createdAtFrom = filters.createdAtFrom
    if (filters.createdAtTo) p.createdAtTo = filters.createdAtTo
    if (filters.resolvedAtFrom) p.resolvedAtFrom = filters.resolvedAtFrom
    if (filters.resolvedAtTo) p.resolvedAtTo = filters.resolvedAtTo
    return p
  }

  const { data: tickets = [], isFetching } = useQuery({
    queryKey: ['ticket-search', filters],
    queryFn: () => api.get('/tickets', { params: buildParams() }).then(r => r.data),
    enabled: submitted,
  })

  const totalPages = Math.ceil(tickets.length / PAGE_SIZE)
  const paginated = tickets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(0)
    setSubmitted(true)
  }

  function clearFilters() {
    setFilters({ search: '', companyId: '', createdById: '', assignedToId: '', status: '', createdAtFrom: '', createdAtTo: '', resolvedAtFrom: '', resolvedAtTo: '' })
    setSubmitted(false)
  }

  const f = (k: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters(prev => ({ ...prev, [k]: e.target.value }))

  const internalUsers = users.filter((u: any) => u.userType === 'INTERNAL')
  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ticket Search</h1>
        <p className="text-sm text-slate-500">Search tickets by multiple parameters at once</p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        {/* Keyword search */}
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Keyword</label>
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5">
            <Search size={14} className="text-slate-400 flex-shrink-0" />
            <input value={filters.search} onChange={f('search')} placeholder="Search title or description…" className="text-sm outline-none flex-1 text-slate-700" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Customer</label>
            <SearchableSelect
              value={filters.companyId}
              onChange={val => setFilters(prev => ({ ...prev, companyId: val }))}
              options={companies.map((c: any) => ({ value: c.id, label: c.name }))}
              placeholder="Any customer"
              emptyLabel="Any customer"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Status</label>
            <select value={filters.status} onChange={f('status')} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary-400">
              <option value="">Any status</option>
              <option value="AWAITING_TRIAGE">Awaiting Triage</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_CLIENT">Waiting Client</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Reporter</label>
            <SearchableSelect
              value={filters.createdById}
              onChange={val => setFilters(prev => ({ ...prev, createdById: val }))}
              options={users.map((u: any) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))}
              placeholder="Any reporter"
              emptyLabel="Any reporter"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Assigned To</label>
            <SearchableSelect
              value={filters.assignedToId}
              onChange={val => setFilters(prev => ({ ...prev, assignedToId: val }))}
              options={internalUsers.map((u: any) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))}
              placeholder="Anyone"
              emptyLabel="Anyone"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Date Raised — From</label>
            <input type="date" value={filters.createdAtFrom} onChange={f('createdAtFrom')} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary-400" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Date Raised — To</label>
            <input type="date" value={filters.createdAtTo} onChange={f('createdAtTo')} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary-400" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Date Closed — From</label>
            <input type="date" value={filters.resolvedAtFrom} onChange={f('resolvedAtFrom')} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary-400" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Date Closed — To</label>
            <input type="date" value={filters.resolvedAtTo} onChange={f('resolvedAtTo')} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary-400" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button type="button" onClick={clearFilters} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600">
            <X size={14} /> Clear filters
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2 text-sm">
            <Search size={14} /> Search
          </button>
        </div>
      </form>

      {/* Results */}
      {submitted && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">
              {isFetching ? 'Searching…' : `${tickets.length} result${tickets.length !== 1 ? 's' : ''} found`}
            </p>
          </div>

          {!isFetching && tickets.length === 0 ? (
            <div className="card p-12 text-center text-slate-400">
              <Search size={36} className="mx-auto mb-2 opacity-20" />
              <p className="font-medium">No tickets matched your search</p>
              <p className="text-sm mt-1">Try broadening your filters</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 w-28">Ref</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Title</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Reporter</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Customer</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Priority</th>
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
                        <Link to={`/tickets/${ticketRef(ticket.number)}`} className="text-sm font-medium text-slate-800 hover:text-primary-600 line-clamp-1 max-w-[220px] block">
                          {ticket.title}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                        {ticket.createdBy ? `${ticket.createdBy.firstName} ${ticket.createdBy.lastName}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">{ticket.company?.name || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={clsx('badge text-xs', statusColors[ticket.status])}>{ticket.status.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={clsx('badge text-xs', priorityColors[ticket.priority])}>{ticket.priority}</span>
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
                  <span className="text-xs text-slate-500">Page {page + 1} of {totalPages} ({tickets.length} total)</span>
                  <div className="flex gap-2">
                    <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">← Prev</button>
                    <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Next →</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
