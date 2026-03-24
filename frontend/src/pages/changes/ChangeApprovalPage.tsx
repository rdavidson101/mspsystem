import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import clsx from 'clsx'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

const riskColors: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

export default function ChangeApprovalPage() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const defaultAction = searchParams.get('action') as 'approve' | 'reject' | null

  const [change, setChange] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(defaultAction)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    api.get(`/changes/client-approval/${token}`)
      .then(r => setChange(r.data))
      .catch(e => setError(e.response?.data?.error || 'This approval link is invalid or has expired.'))
  }, [token])

  const handleSubmit = async () => {
    if (!action) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.post(`/changes/client-approval/${token}`, { action, comment })
      setSubmitted(true)
    } catch (e: any) {
      setSubmitError(e.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
        <AlertTriangle size={40} className="text-amber-500 mx-auto mb-4" />
        <h1 className="text-lg font-semibold text-slate-800 mb-2">Link Invalid</h1>
        <p className="text-sm text-slate-500">{error}</p>
      </div>
    </div>
  )

  if (!change) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-400">Loading…</p>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
        {action === 'approve' ? (
          <>
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-800 mb-2">Change Approved</h1>
            <p className="text-sm text-slate-500">Thank you. The team has been notified and will proceed with the change as scheduled.</p>
          </>
        ) : (
          <>
            <XCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-800 mb-2">Change Rejected</h1>
            <p className="text-sm text-slate-500">Thank you for your response. The team has been notified and will be in touch.</p>
          </>
        )}
      </div>
    </div>
  )

  if (['APPROVED', 'REJECTED'].includes(change.status)) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
        <CheckCircle size={40} className="text-slate-400 mx-auto mb-4" />
        <h1 className="text-lg font-semibold text-slate-800 mb-2">Already Reviewed</h1>
        <p className="text-sm text-slate-500">This change request has already been {change.status.toLowerCase()}.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="bg-indigo-600 rounded-xl p-6 text-white">
          <p className="text-indigo-200 text-sm mb-1">{change.ref} · Change Request Awaiting Approval</p>
          <h1 className="text-2xl font-bold">{change.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', riskColors[change.risk])}>{change.risk} Risk</span>
            {change.scheduledStart && (
              <span className="text-indigo-200 text-sm">Scheduled: {format(new Date(change.scheduledStart), 'PPPp')}</span>
            )}
          </div>
        </div>

        {/* Change details */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
          {[
            { label: 'Scope', value: change.scope },
            { label: 'Reason for Change', value: change.reason },
            { label: 'Risks', value: change.risks },
            { label: 'Implementation Plan', value: change.implementationPlan },
            { label: 'Validation Steps', value: change.validationSteps },
            { label: 'Rollback Plan', value: change.rollbackSteps },
          ].filter(f => f.value).map(f => (
            <div key={f.label} className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{f.label}</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{f.value}</p>
            </div>
          ))}
        </div>

        {/* Action */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Your Decision</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setAction('approve')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 font-semibold text-sm transition-colors',
                action === 'approve'
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'border-green-200 text-green-700 hover:bg-green-50'
              )}
            >
              <CheckCircle size={16} /> Approve
            </button>
            <button
              onClick={() => setAction('reject')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 font-semibold text-sm transition-colors',
                action === 'reject'
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'border-red-200 text-red-700 hover:bg-red-50'
              )}
            >
              <XCircle size={16} /> Reject
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Comment <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              placeholder={action === 'reject' ? 'Please provide a reason for rejection…' : 'Any comments or conditions…'}
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <button
            onClick={handleSubmit}
            disabled={!action || submitting}
            className={clsx(
              'w-full py-3 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50',
              action === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' :
              action === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' :
              'bg-slate-200 text-slate-500'
            )}
          >
            {submitting ? 'Submitting…' : action === 'approve' ? 'Confirm Approval' : action === 'reject' ? 'Confirm Rejection' : 'Select an action above'}
          </button>
        </div>
      </div>
    </div>
  )
}
