import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ArrowLeft, Pencil, CheckCircle, XCircle, Clock, AlertTriangle, Ban, CheckCircle2, XOctagon } from 'lucide-react'
import { format } from 'date-fns'
import clsx from 'clsx'
import { useAuthStore } from '@/store/authStore'

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
  FAILED: 'bg-red-100 text-red-800',
  ABANDONED: 'bg-slate-100 text-slate-400',
}

const riskColors: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

// Workflow pipeline steps
const pipeline = ['DRAFT', 'SUBMITTED', 'INTERNAL_REVIEW', 'CUSTOMER_REVIEW', 'APPROVED']
const pipelineLabels: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  INTERNAL_REVIEW: 'Internal Review',
  CUSTOMER_REVIEW: 'Customer Review',
  APPROVED: 'Approved',
}

export default function ChangeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [approvalNotes, setApprovalNotes] = useState('')
  const [showApprovalInput, setShowApprovalInput] = useState<'approve' | 'reject' | null>(null)
  const [showAbandon, setShowAbandon] = useState(false)

  const { data: change, isLoading } = useQuery({ queryKey: ['change', id], queryFn: () => api.get(`/changes/${id}`).then(r => r.data) })

  const actionMutation = useMutation({
    mutationFn: ({ endpoint, notes }: { endpoint: string; notes: string }) =>
      api.post(`/changes/${id}/${endpoint}`, { notes }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['change', id] }); qc.invalidateQueries({ queryKey: ['changes'] }); setShowApprovalInput(null); setApprovalNotes('') },
  })

  const requestClientApprovalMutation = useMutation({
    mutationFn: () => api.post(`/changes/${id}/request-client-approval`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['change', id] }); qc.invalidateQueries({ queryKey: ['changes'] }) },
  })

  if (isLoading || !change) return <div className="p-8 text-slate-400">Loading…</div>

  const isInternalApprover = change.internalApproverId === user?.id
  const canApproveInternal = isInternalApprover && change.status === 'SUBMITTED'
  const canApproveCustomer = change.status === 'CUSTOMER_REVIEW' // any internal user can record customer approval
  const canEdit = change.status === 'DRAFT'
  const isRequester = change.createdById === user?.id
  const canPostApprovalAction = ['APPROVED', 'IN_PROGRESS'].includes(change.status) && (user?.role === 'ADMIN' || user?.role === 'MANAGER' || isRequester)
  const canAbandon = change.status === 'DRAFT' && isRequester

  const Field = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{value}</p>
      </div>
    ) : null

  const pipelineIndex = pipeline.indexOf(change.status)

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/changes')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 mt-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-sm font-bold text-primary-600">{change.ref}</span>
            <span className={clsx('badge text-xs', statusColors[change.status])}>{change.status.replace(/_/g, ' ')}</span>
            <span className={clsx('badge text-xs', riskColors[change.risk])}>
              {change.risk === 'CRITICAL' && <AlertTriangle size={11} className="inline mr-1" />}
              {change.risk} RISK
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{change.title}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Raised by {change.createdBy?.firstName} {change.createdBy?.lastName} · {format(new Date(change.createdAt), 'MMM d, yyyy HH:mm')}
          </p>
        </div>
        {canEdit && (
          <button onClick={() => navigate(`/changes/${id}/edit`)} className="btn-secondary flex items-center gap-2 text-sm">
            <Pencil size={14} /> Edit
          </button>
        )}
      </div>

      {/* Workflow pipeline */}
      {!['REJECTED', 'CANCELLED', 'IN_PROGRESS', 'COMPLETED'].includes(change.status) && (
        <div className="card p-4">
          <div className="flex items-center">
            {pipeline.map((step, i) => (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className={clsx('flex flex-col items-center', i < pipeline.length - 1 ? 'flex-1' : '')}>
                  <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2',
                    i < pipelineIndex ? 'bg-green-500 border-green-500 text-white' :
                    i === pipelineIndex ? 'bg-primary-600 border-primary-600 text-white' :
                    'bg-white border-slate-200 text-slate-400'
                  )}>
                    {i < pipelineIndex ? <CheckCircle size={14} /> : i + 1}
                  </div>
                  <span className={clsx('text-xs mt-1.5 font-medium whitespace-nowrap',
                    i === pipelineIndex ? 'text-primary-600' : i < pipelineIndex ? 'text-green-600' : 'text-slate-400'
                  )}>{pipelineLabels[step]}</span>
                </div>
                {i < pipeline.length - 1 && (
                  <div className={clsx('h-0.5 flex-1 mx-2 mb-4', i < pipelineIndex ? 'bg-green-400' : 'bg-slate-200')} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approval action */}
      {(canApproveInternal || canApproveCustomer) && (
        <div className={clsx('card p-4 border-2', canApproveInternal ? 'border-amber-200 bg-amber-50' : 'border-purple-200 bg-purple-50')}>
          <p className="text-sm font-semibold mb-3 text-slate-800">
            {canApproveInternal ? '⏳ Awaiting your internal approval' : '⏳ Awaiting customer approval'}
          </p>
          {showApprovalInput ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 font-medium">
                {showApprovalInput === 'approve' ? 'Approving this change' : 'Rejecting this change'} — add an optional comment:
              </p>
              <textarea
                className="input resize-none text-sm"
                rows={3}
                placeholder="Optional notes..."
                value={approvalNotes}
                onChange={e => setApprovalNotes(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const endpoint = showApprovalInput === 'approve'
                      ? (canApproveInternal ? 'approve-internal' : 'approve-customer')
                      : (canApproveInternal ? 'reject-internal' : 'reject-customer')
                    actionMutation.mutate({ endpoint, notes: approvalNotes })
                  }}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg",
                    showApprovalInput === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  )}
                >
                  {showApprovalInput === 'approve' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  {showApprovalInput === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
                </button>
                <button onClick={() => { setShowApprovalInput(null); setApprovalNotes('') }} className="btn-secondary text-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setShowApprovalInput('approve')} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg">
                <CheckCircle size={14} /> Approve
              </button>
              <button onClick={() => setShowApprovalInput('reject')} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg">
                <XCircle size={14} /> Reject
              </button>
            </div>
          )}
        </div>
      )}

      {/* Post-approval outcome */}
      {canPostApprovalAction && (
        <div className="card p-4 border-2 border-green-200 bg-green-50">
          <p className="text-sm font-semibold mb-3 text-slate-800">Mark change outcome:</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => actionMutation.mutate({ endpoint: 'complete', notes: '' })}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
            >
              <CheckCircle size={14} /> Completed
            </button>
            <button
              onClick={() => actionMutation.mutate({ endpoint: 'fail', notes: '' })}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg"
            >
              <XCircle size={14} /> Failed
            </button>
            <button
              onClick={() => actionMutation.mutate({ endpoint: 'cancel', notes: '' })}
              className="flex items-center gap-2 px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white text-sm font-medium rounded-lg"
            >
              <XCircle size={14} /> Cancelled
            </button>
          </div>
        </div>
      )}

      {/* Abandon (draft only) */}
      {canAbandon && (
        <div className="card p-4 border-2 border-slate-200">
          {showAbandon ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-600 flex-1">Are you sure you want to abandon this RFC? It will be cancelled.</p>
              <button
                onClick={() => { actionMutation.mutate({ endpoint: 'abandon', notes: '' }); setShowAbandon(false) }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg"
              >
                Yes, Abandon
              </button>
              <button onClick={() => setShowAbandon(false)} className="btn-secondary text-sm">Keep</button>
            </div>
          ) : (
            <button
              onClick={() => setShowAbandon(true)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-600 font-medium"
            >
              <XCircle size={14} /> Abandon this RFC
            </button>
          )}
        </div>
      )}

      {/* Main details grid */}
      <div className="grid grid-cols-2 gap-5">
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Overview</h3>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Requester</p>
            <p className="text-sm text-slate-700">{change.createdBy?.firstName} {change.createdBy?.lastName}</p>
          </div>
          <Field label="Customer" value={change.companyRef?.name} />
          <Field label="Scope" value={change.scope} />
          {change.scheduledStart && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Scheduled</p>
              <p className="text-sm text-slate-700 flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400" />
                {format(new Date(change.scheduledStart), 'MMM d, yyyy HH:mm')}
                {change.durationMinutes && <span className="text-slate-400">· {change.durationMinutes} min</span>}
              </p>
            </div>
          )}
        </div>
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Approvers</h3>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Internal Approver</p>
            <p className="text-sm text-slate-700">{change.internalApprover ? `${change.internalApprover.firstName} ${change.internalApprover.lastName}` : '—'}</p>
            {change.internalApprovedAt && <p className="text-xs text-green-600 mt-0.5">✓ Approved {format(new Date(change.internalApprovedAt), 'MMM d, HH:mm')}</p>}
            {change.internalRejectedAt && <p className="text-xs text-red-600 mt-0.5">✗ Rejected {format(new Date(change.internalRejectedAt), 'MMM d, HH:mm')}</p>}
            {change.internalNotes && <p className="text-xs text-slate-500 italic mt-1">"{change.internalNotes}"</p>}
          </div>
          {/* Client Approver */}
          {change.clientApprover ? (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Client Approver</p>
              <p className="text-sm text-slate-700">{change.clientApprover.firstName} {change.clientApprover.lastName}</p>
              <p className="text-xs text-slate-500">{change.clientApprover.email}</p>
              {change.status === 'CUSTOMER_REVIEW' && (
                <div className="mt-2">
                  {change.clientApprovalSentAt ? (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400">Approval email sent {format(new Date(change.clientApprovalSentAt), 'MMM d, h:mm a')}</p>
                      <button
                        onClick={() => requestClientApprovalMutation.mutate()}
                        disabled={requestClientApprovalMutation.isPending}
                        className="text-xs text-primary-600 hover:underline"
                      >
                        Resend email
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => requestClientApprovalMutation.mutate()}
                      disabled={requestClientApprovalMutation.isPending}
                      className="btn btn-primary text-xs py-1 px-3"
                    >
                      {requestClientApprovalMutation.isPending ? 'Sending…' : 'Send for Client Approval'}
                    </button>
                  )}
                </div>
              )}
              {change.status === 'APPROVED' && change.customerApprovedAt && (
                <p className="text-xs text-green-600 mt-1">✓ Approved {format(new Date(change.customerApprovedAt), 'MMM d, yyyy')}{change.customerNotes ? ` — "${change.customerNotes}"` : ''}</p>
              )}
              {change.status === 'REJECTED' && change.customerRejectedAt && (
                <p className="text-xs text-red-600 mt-1">✗ Rejected {format(new Date(change.customerRejectedAt), 'MMM d, yyyy')}{change.customerNotes ? ` — "${change.customerNotes}"` : ''}</p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Customer Approver</p>
              <p className="text-sm text-slate-700">{change.customerApproverName || '—'}</p>
              {change.customerApproverEmail && <p className="text-xs text-slate-400">{change.customerApproverEmail}</p>}
              {change.customerApprovedAt && <p className="text-xs text-green-600 mt-0.5">✓ Approved {format(new Date(change.customerApprovedAt), 'MMM d, HH:mm')}</p>}
              {change.customerRejectedAt && <p className="text-xs text-red-600 mt-0.5">✗ Rejected {format(new Date(change.customerRejectedAt), 'MMM d, HH:mm')}</p>}
              {change.customerNotes && <p className="text-xs text-slate-500 italic mt-1">"{change.customerNotes}"</p>}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5 space-y-5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Change Details</h3>
        <Field label="Reason for Change" value={change.reason} />
        <Field label="Risks" value={change.risks} />
        <Field label="Implementation Plan" value={change.implementationPlan} />
        <Field label="Validation Steps" value={change.validationSteps} />
        <Field label="Rollback Steps" value={change.rollbackSteps} />
      </div>
    </div>
  )
}
