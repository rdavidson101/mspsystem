import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { changeRef } from '@/lib/refs'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Plus, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

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

const riskColors: Record<string, string> = {
  LOW: 'text-green-600',
  MEDIUM: 'text-amber-600',
  HIGH: 'text-orange-600',
  CRITICAL: 'text-red-600',
}

export default function MyChangesPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const { data: changes = [] } = useQuery({
    queryKey: ['changes', 'my-changes', user?.id],
    queryFn: () => api.get('/changes', { params: { createdById: user?.id } }).then(r => r.data),
    enabled: !!user?.id,
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Changes</h1>
          <p className="text-sm text-slate-500">{changes.length} change{changes.length !== 1 ? 's' : ''} raised by you</p>
        </div>
        <button onClick={() => navigate('/changes/new')} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Raise RFC
        </button>
      </div>

      {changes.length === 0 ? (
        <div className="card p-16 flex flex-col items-center text-center">
          <AlertTriangle size={28} className="text-slate-300 mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No changes raised yet</h3>
          <p className="text-sm text-slate-400 mt-1">Changes you raise will appear here.</p>
          <button onClick={() => navigate('/changes/new')} className="btn-primary text-sm mt-4">Raise your first RFC</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 w-28">RFC #</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Title</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Customer</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Risk</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Scheduled</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((c: any) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer" onClick={() => navigate('/changes/' + changeRef(c.number))}>
                  <td className="py-3 px-4 font-mono text-xs font-bold text-primary-600">{c.ref}</td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-800">{c.title}</td>
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
                  <td className="py-3 px-4">
                    <span className={clsx('badge text-xs', statusColors[c.status])}>{c.status.replace(/_/g, ' ')}</span>
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
