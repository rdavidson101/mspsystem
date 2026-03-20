import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { changeRef } from '@/lib/refs'
import { Plus, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import clsx from 'clsx'
import { useNavigate } from 'react-router-dom'

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  INTERNAL_REVIEW: 'bg-amber-100 text-amber-700',
  CUSTOMER_REVIEW: 'bg-purple-100 text-purple-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-cyan-100 text-cyan-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-slate-100 text-slate-400',
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  INTERNAL_REVIEW: 'Internal Review',
  CUSTOMER_REVIEW: 'Customer Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const riskColors: Record<string, string> = {
  LOW: 'text-green-600',
  MEDIUM: 'text-amber-600',
  HIGH: 'text-orange-600',
  CRITICAL: 'text-red-600',
}

export default function ChangesPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const { data: changes = [] } = useQuery({
    queryKey: ['changes', statusFilter],
    queryFn: () => api.get('/changes', { params: statusFilter ? { status: statusFilter } : {} }).then(r => r.data),
  })

  const counts = changes.reduce((acc: any, c: any) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc }, {})
  const activeStatuses = ['SUBMITTED', 'INTERNAL_REVIEW', 'CUSTOMER_REVIEW']
  const pendingApproval = changes.filter((c: any) => activeStatuses.includes(c.status)).length

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Change Management</h1>
          <p className="text-sm text-slate-500">{changes.length} changes · {pendingApproval} pending approval</p>
        </div>
        <button onClick={() => navigate('/changes/new')} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Raise RFC
        </button>
      </div>

      {/* Status pills */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setStatusFilter('')} className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', !statusFilter ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
          All <span className="ml-1 opacity-70">{changes.length}</span>
        </button>
        {Object.keys(statusLabels).map(s => (counts[s] > 0 || s === statusFilter) && (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)} className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', statusFilter === s ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
            {statusLabels[s]} <span className="ml-1 opacity-70">{counts[s] || 0}</span>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 w-28">RFC #</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Title</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Customer</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Risk</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Scheduled</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Internal Approver</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((c: any) => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => navigate('/changes/' + changeRef(c.number))}>
                <td className="py-3 px-4">
                  <span className="font-mono text-xs font-semibold text-primary-600">{c.ref}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm font-medium text-slate-800 line-clamp-1">{c.title}</span>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{c.companyRef?.name || '—'}</td>
                <td className="py-3 px-4">
                  <span className={clsx('text-xs font-bold', riskColors[c.risk])}>
                    {c.risk === 'CRITICAL' && <AlertTriangle size={12} className="inline mr-1" />}
                    {c.risk}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-slate-500">
                  {c.scheduledStart ? format(new Date(c.scheduledStart), 'MMM d, yyyy HH:mm') : '—'}
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {c.internalApprover ? `${c.internalApprover.firstName} ${c.internalApprover.lastName}` : '—'}
                </td>
                <td className="py-3 px-4">
                  <span className={clsx('badge text-xs', statusColors[c.status])}>{statusLabels[c.status]}</span>
                </td>
              </tr>
            ))}
            {changes.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-sm text-slate-400">No changes found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
