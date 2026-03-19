import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { changeRef } from '@/lib/refs'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'

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

export default function MyApprovalsPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [showAction, setShowAction] = useState<Record<string, 'approve' | 'reject' | null>>({})

  const { data: changes = [] } = useQuery({
    queryKey: ['changes', 'my-approvals', user?.id],
    queryFn: () => api.get('/changes', { params: { internalApproverId: user?.id } }).then(r => r.data),
    enabled: !!user?.id,
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, endpoint, note }: { id: string; endpoint: string; note: string }) =>
      api.post(`/changes/${id}/${endpoint}`, { notes: note }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['changes', 'my-approvals'] }) },
  })

  const pending = changes.filter((c: any) => c.status === 'SUBMITTED')
  const completed = changes.filter((c: any) => c.status !== 'SUBMITTED')

  const ChangeRow = ({ c }: { c: any }) => {
    const isPending = c.status === 'SUBMITTED'
    const action = showAction[c.id]

    return (
      <div className="card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="cursor-pointer flex-1" onClick={() => navigate('/changes/' + changeRef(c.number))}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-primary-600">{c.ref}</span>
              <span className={clsx('badge text-xs', statusColors[c.status])}>{c.status.replace(/_/g, ' ')}</span>
              <span className={clsx('text-xs font-bold', riskColors[c.risk])}>{c.risk}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{c.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {c.companyRef?.name && <span>{c.companyRef.name} · </span>}
              {c.scheduledStart ? format(new Date(c.scheduledStart), 'MMM d, yyyy HH:mm') : 'No date set'}
            </p>
          </div>
          {isPending && !action && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setShowAction(s => ({ ...s, [c.id]: 'approve' }))}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg"
              >
                <CheckCircle size={13} /> Approve
              </button>
              <button
                onClick={() => setShowAction(s => ({ ...s, [c.id]: 'reject' }))}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg"
              >
                <XCircle size={13} /> Reject
              </button>
            </div>
          )}
        </div>

        {action && (
          <div className={clsx('p-3 rounded-lg border space-y-2', action === 'approve' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
            <p className="text-xs font-medium text-slate-700">
              {action === 'approve' ? 'Approving' : 'Rejecting'} — add an optional comment:
            </p>
            <textarea
              className="input resize-none text-sm w-full"
              rows={2}
              placeholder="Optional comment..."
              value={notes[c.id] || ''}
              onChange={e => setNotes(n => ({ ...n, [c.id]: e.target.value }))}
            />
            <div className="flex gap-2">
              <button
                onClick={() => actionMutation.mutate({
                  id: c.id,
                  endpoint: action === 'approve' ? 'approve-internal' : 'reject-internal',
                  note: notes[c.id] || '',
                })}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg',
                  action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                )}
              >
                {action === 'approve' ? <CheckCircle size={13} /> : <XCircle size={13} />}
                Confirm {action === 'approve' ? 'Approval' : 'Rejection'}
              </button>
              <button
                onClick={() => setShowAction(s => ({ ...s, [c.id]: null }))}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!isPending && c.internalApprovedAt && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle size={11} /> Approved {format(new Date(c.internalApprovedAt), 'MMM d, yyyy')}
            {c.internalNotes && <span className="text-slate-400 ml-1">· "{c.internalNotes}"</span>}
          </p>
        )}
        {!isPending && c.internalRejectedAt && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <XCircle size={11} /> Rejected {format(new Date(c.internalRejectedAt), 'MMM d, yyyy')}
            {c.internalNotes && <span className="text-slate-400 ml-1">· "{c.internalNotes}"</span>}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Approvals</h1>
        <p className="text-sm text-slate-500">{pending.length} pending · {completed.length} completed</p>
      </div>

      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
            <Clock size={12} className="text-amber-500" /> Pending Approval ({pending.length})
          </h2>
          {pending.map((c: any) => <ChangeRow key={c.id} c={c} />)}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Previously Reviewed ({completed.length})</h2>
          {completed.map((c: any) => <ChangeRow key={c.id} c={c} />)}
        </div>
      )}

      {changes.length === 0 && (
        <div className="card p-16 flex flex-col items-center text-center">
          <CheckCircle size={28} className="text-slate-300 mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No changes assigned to you</h3>
          <p className="text-sm text-slate-400 mt-1">Changes assigned to you for approval will appear here.</p>
        </div>
      )}
    </div>
  )
}
