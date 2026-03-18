import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ArrowLeft, Send, Clock, Lock, Unlock } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/store/authStore'

const priorityColors: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}
const statusColors: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-orange-100 text-orange-700',
  WAITING_CLIENT: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-600',
}

export default function TicketDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [comment, setComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)

  const { data: ticket } = useQuery({ queryKey: ['ticket', id], queryFn: () => api.get(`/tickets/${id}`).then(r => r.data) })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/tickets/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket', id] }),
  })
  const commentMutation = useMutation({
    mutationFn: (data: any) => api.post(`/tickets/${id}/comments`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ticket', id] }); setComment('') },
  })

  if (!ticket) return <div className="p-8 text-center text-slate-400">Loading...</div>

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{ticket.title}</h1>
          <p className="text-sm text-slate-400">Ticket #{ticket.number}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-4">
          {/* Description */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Description</h3>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{ticket.description || 'No description provided.'}</p>
          </div>

          {/* Comments */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Comments ({ticket.comments?.length || 0})</h3>
            <div className="space-y-4 mb-6">
              {(ticket.comments || []).map((c: any) => (
                <div key={c.id} className={clsx('flex gap-3', c.isInternal && 'opacity-70')}>
                  <div className="w-8 h-8 rounded-full bg-primary-600 flex-shrink-0 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">{c.user.firstName[0]}{c.user.lastName[0]}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-800">{c.user.firstName} {c.user.lastName}</span>
                      {c.isInternal && <span className="badge bg-slate-100 text-slate-500 text-xs flex items-center gap-1"><Lock size={10} /> Internal</span>}
                      <span className="text-xs text-slate-400">{format(new Date(c.createdAt), 'MMM d, h:mm a')}</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-700">{c.content}</div>
                  </div>
                </div>
              ))}
              {ticket.comments?.length === 0 && <p className="text-sm text-slate-400">No comments yet.</p>}
            </div>
            {/* Add comment */}
            <div className="border-t border-slate-100 pt-4">
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Write a comment..."
                className="input h-20 resize-none mb-2"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="rounded" />
                  <span className="flex items-center gap-1">{isInternal ? <Lock size={13} /> : <Unlock size={13} />} Internal note</span>
                </label>
                <button
                  onClick={() => commentMutation.mutate({ content: comment, isInternal })}
                  disabled={!comment.trim() || commentMutation.isPending}
                  className="btn-primary flex items-center gap-2 text-sm py-1.5"
                >
                  <Send size={13} /> Send
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-4 space-y-4">
            <div>
              <label className="label">Status</label>
              <select
                value={ticket.status}
                onChange={e => updateMutation.mutate({ status: e.target.value })}
                className="input"
              >
                {['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED'].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select
                value={ticket.priority}
                onChange={e => updateMutation.mutate({ priority: e.target.value })}
                className="input"
              >
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Assigned To</label>
              <select
                value={ticket.assignedToId || ''}
                onChange={e => updateMutation.mutate({ assignedToId: e.target.value || null })}
                className="input"
              >
                <option value="">Unassigned</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Company</label>
              <p className="text-sm text-slate-700">{ticket.company?.name || '—'}</p>
            </div>
            <div>
              <label className="label">Created</label>
              <p className="text-sm text-slate-700">{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</p>
            </div>
            {ticket.resolvedAt && (
              <div>
                <label className="label">Resolved</label>
                <p className="text-sm text-slate-700">{format(new Date(ticket.resolvedAt), 'MMM d, yyyy')}</p>
              </div>
            )}
          </div>

          {/* Time entries */}
          <div className="card p-4">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Clock size={15} /> Time Logged
            </h3>
            <p className="text-2xl font-bold text-primary-600">
              {(ticket.timeEntries || []).reduce((sum: number, e: any) => sum + e.hours, 0).toFixed(1)}h
            </p>
            <p className="text-xs text-slate-400">{ticket.timeEntries?.length || 0} entries</p>
          </div>
        </div>
      </div>
    </div>
  )
}
