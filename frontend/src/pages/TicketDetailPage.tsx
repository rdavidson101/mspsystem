import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ArrowLeft, Send, Lock, Unlock, Clock, ChevronDown, Zap, User, Tag, Building2, AlertCircle, History, MessageSquare } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/store/authStore'

function ticketRef(number: number) {
  return `INC-${String(number).padStart(5, '0')}`
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}
const slaBadgeStyles: Record<string, string> = {
  ok: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  breached: 'bg-red-100 text-red-700',
}

function getSlaInfo(ticket: any): { status: 'ok' | 'warning' | 'breached' | 'none'; timeLeft: string } {
  if (!ticket.slaResolutionDue || ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
    return { status: 'none', timeLeft: '' }
  }
  const now = Date.now()
  const due = new Date(ticket.slaResolutionDue).getTime()
  const created = new Date(ticket.createdAt).getTime()
  const totalMs = due - created
  const remainingMs = due - now

  if (remainingMs < 0) {
    const overMs = -remainingMs
    const h = Math.floor(overMs / 3600000)
    const m = Math.floor((overMs % 3600000) / 60000)
    return { status: 'breached', timeLeft: h > 0 ? `${h}h ${m}m over` : `${m}m over` }
  }
  const h = Math.floor(remainingMs / 3600000)
  const m = Math.floor((remainingMs % 3600000) / 60000)
  const timeLeft = h > 0 ? `${h}h ${m}m` : `${m}m`
  return {
    status: remainingMs / totalMs < 0.2 ? 'warning' : 'ok',
    timeLeft,
  }
}
const statusColors: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-orange-100 text-orange-700',
  WAITING_CLIENT: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-600',
}

const historyFieldLabels: Record<string, string> = {
  status: 'Status',
  priority: 'Priority',
  assignedTo: 'Assigned To',
  category: 'Category',
  title: 'Title',
}

function applyMacroVariables(content: string, ticket: any, user: any): string {
  const requesterName = ticket.createdBy ? `${ticket.createdBy.firstName} ${ticket.createdBy.lastName}` : 'Customer'
  const assigneeName = ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : (user ? `${user.firstName} ${user.lastName}` : 'Support Team')
  return content
    .replace(/\{\{requester_name\}\}/g, requesterName)
    .replace(/\{\{ticket_ref\}\}/g, ticketRef(ticket.number))
    .replace(/\{\{assignee_name\}\}/g, assigneeName)
    .replace(/\{\{company_name\}\}/g, ticket.company?.name || 'your company')
    .replace(/\{\{priority\}\}/g, ticket.priority)
}

function HistoryEntry({ entry }: { entry: any }) {
  const label = historyFieldLabels[entry.field] || entry.field
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <History size={13} className="text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700">
          <span className="font-medium">{entry.user.firstName} {entry.user.lastName}</span>
          {' changed '}
          <span className="font-medium">{label}</span>
          {entry.oldValue && (
            <> from <span className="font-mono text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">{entry.oldValue}</span></>
          )}
          {' to '}
          <span className="font-mono text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">{entry.newValue}</span>
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{format(new Date(entry.createdAt), 'MMM d, yyyy h:mm a')}</p>
      </div>
    </div>
  )
}

function CommentBubble({ comment }: { comment: any }) {
  return (
    <div className={clsx(
      'rounded-lg p-4 border-l-4',
      comment.isInternal
        ? 'bg-orange-50 border-orange-400'
        : 'bg-slate-50 border-slate-200'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className={clsx(
          'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
          comment.isInternal ? 'bg-orange-500' : 'bg-primary-600'
        )}>
          <span className="text-white text-xs font-semibold">
            {comment.user.firstName[0]}{comment.user.lastName[0]}
          </span>
        </div>
        <span className={clsx('text-sm font-medium', comment.isInternal ? 'text-orange-900' : 'text-slate-800')}>
          {comment.user.firstName} {comment.user.lastName}
        </span>
        {comment.isInternal && (
          <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
            <Lock size={10} /> Internal Note
          </span>
        )}
        <span className="text-xs text-slate-400 ml-auto">{format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}</span>
      </div>
      <p className={clsx('text-sm whitespace-pre-wrap', comment.isInternal ? 'text-orange-800' : 'text-slate-700')}>
        {comment.content}
      </p>
    </div>
  )
}

export default function TicketDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [comment, setComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [activeTab, setActiveTab] = useState<'activity' | 'history'>('activity')
  const [showMacroPicker, setShowMacroPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: ticket, refetch } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.get(`/tickets/${id}`).then(r => r.data),
  })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) })
  const { data: macros = [] } = useQuery({ queryKey: ['macros'], queryFn: () => api.get('/macros').then(r => r.data) })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/tickets/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket', id] }),
  })
  const commentMutation = useMutation({
    mutationFn: (data: any) => api.post(`/tickets/${id}/comments`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ticket', id] }); setComment('') },
  })

  function insertMacro(macro: any) {
    const resolved = applyMacroVariables(macro.content, ticket, user)
    setComment(resolved)
    setShowMacroPicker(false)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  if (!ticket) return (
    <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>
  )

  const totalHours = (ticket.timeEntries || []).reduce((s: number, e: any) => s + e.hours, 0)

  // Merge comments and history for activity tab, sorted by date
  const activityItems = [
    ...(ticket.comments || []).map((c: any) => ({ ...c, _type: 'comment' })),
    ...(ticket.history || []).map((h: any) => ({ ...h, _type: 'history' })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 mt-0.5 flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-mono font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg">
              {ticketRef(ticket.number)}
            </span>
            <span className={clsx('badge text-xs', statusColors[ticket.status])}>{ticket.status.replace(/_/g, ' ')}</span>
            <span className={clsx('badge text-xs', priorityColors[ticket.priority])}>{ticket.priority}</span>
            {ticket.category && (
              <span className="badge text-xs font-medium" style={{ backgroundColor: ticket.category.color + '20', color: ticket.category.color }}>
                {ticket.category.name}
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-2">{ticket.title}</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Opened by <span className="text-slate-600 font-medium">{ticket.createdBy?.firstName} {ticket.createdBy?.lastName}</span>
            {' · '}{format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-4">
          {/* Description */}
          {ticket.description && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Description</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
            </div>
          )}

          {/* Activity / History tabs */}
          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 px-4">
              <div className="flex gap-0">
                <button
                  onClick={() => setActiveTab('activity')}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === 'activity' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  )}
                >
                  <MessageSquare size={14} /> Activity
                  <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                    {(ticket.comments?.length || 0) + (ticket.history?.length || 0)}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === 'history' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  )}
                >
                  <History size={14} /> History
                  <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                    {ticket.history?.length || 0}
                  </span>
                </button>
              </div>
            </div>

            <div className="p-5">
              {/* Activity tab: interleaved comments + history */}
              {activeTab === 'activity' && (
                <div className="space-y-3">
                  {activityItems.map((item: any) =>
                    item._type === 'comment' ? (
                      <CommentBubble key={`c-${item.id}`} comment={item} />
                    ) : (
                      <HistoryEntry key={`h-${item.id}`} entry={item} />
                    )
                  )}
                  {activityItems.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">No activity yet.</p>
                  )}
                </div>
              )}

              {/* History tab: field changes only */}
              {activeTab === 'history' && (
                <div>
                  {(ticket.history || []).map((entry: any) => (
                    <HistoryEntry key={entry.id} entry={entry} />
                  ))}
                  {(ticket.history || []).length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">No history recorded yet.</p>
                  )}
                </div>
              )}
            </div>

            {/* Reply composer */}
            <div className="border-t border-slate-100 p-5">
              <div className={clsx(
                'rounded-lg border-2 transition-colors',
                isInternal ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-white'
              )}>
                {isInternal && (
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                    <Lock size={13} className="text-orange-500" />
                    <span className="text-xs font-semibold text-orange-600">Internal Note — not visible to customer</span>
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder={isInternal ? 'Add an internal note...' : 'Write a reply...'}
                  className={clsx(
                    'w-full px-4 py-3 text-sm outline-none resize-none bg-transparent',
                    isInternal ? 'text-orange-900 placeholder-orange-300' : 'text-slate-700 placeholder-slate-400'
                  )}
                  rows={4}
                />
                <div className="flex items-center justify-between px-4 pb-3 gap-3">
                  <div className="flex items-center gap-2">
                    {/* Internal toggle */}
                    <button
                      type="button"
                      onClick={() => setIsInternal(!isInternal)}
                      className={clsx(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        isInternal
                          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      {isInternal ? <Lock size={12} /> : <Unlock size={12} />}
                      {isInternal ? 'Internal' : 'Public'}
                    </button>

                    {/* Macro picker */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowMacroPicker(!showMacroPicker)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        <Zap size={12} /> Macros
                        <ChevronDown size={10} className={clsx('transition-transform', showMacroPicker && 'rotate-180')} />
                      </button>
                      {showMacroPicker && (
                        <div className="absolute bottom-full mb-2 left-0 w-72 bg-white rounded-xl shadow-lg border border-slate-100 z-10 overflow-hidden">
                          <div className="px-3 py-2 border-b border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase">Macro Responses</p>
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {macros.length === 0 && (
                              <p className="text-xs text-slate-400 px-3 py-3">No macros yet. Create them in Settings.</p>
                            )}
                            {macros.map((macro: any) => (
                              <button
                                key={macro.id}
                                onClick={() => insertMacro(macro)}
                                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                              >
                                <p className="text-sm font-medium text-slate-800">{macro.name}</p>
                                <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{macro.content}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => commentMutation.mutate({ content: comment, isInternal })}
                    disabled={!comment.trim() || commentMutation.isPending}
                    className={clsx(
                      'flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
                      isInternal
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                    )}
                  >
                    <Send size={13} />
                    {isInternal ? 'Add Note' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Ticket properties */}
          <div className="card p-4 space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ticket Details</h3>

            {/* Reporter */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
                <User size={12} /> Reporter
              </label>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 text-xs font-semibold">
                    {ticket.createdBy?.firstName?.[0]}{ticket.createdBy?.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{ticket.createdBy?.firstName} {ticket.createdBy?.lastName}</p>
                  <p className="text-xs text-slate-400">{ticket.createdBy?.email}</p>
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Status</label>
              <select
                value={ticket.status}
                onChange={e => updateMutation.mutate({ status: e.target.value })}
                className="input text-sm"
              >
                {['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED'].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
                <AlertCircle size={12} /> Priority
              </label>
              <select
                value={ticket.priority}
                onChange={e => updateMutation.mutate({ priority: e.target.value })}
                className="input text-sm"
              >
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* SLA Status */}
            {(() => {
              const sla = getSlaInfo(ticket)
              if (sla.status === 'none') return null
              return (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">SLA</p>
                  <span className={clsx('badge text-xs font-medium', slaBadgeStyles[sla.status])}>
                    {sla.status === 'breached' ? 'Breached' : sla.status === 'warning' ? 'At Risk' : 'In SLA'}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    {sla.status === 'breached' ? `${sla.timeLeft}` : `${sla.timeLeft} remaining`}
                  </p>
                </div>
              )
            })()}

            {/* Category */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
                <Tag size={12} /> Category
              </label>
              <select
                value={ticket.categoryId || ''}
                onChange={e => updateMutation.mutate({ categoryId: e.target.value || null })}
                className="input text-sm"
              >
                <option value="">No category</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Assigned To */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Assigned To</label>
              <select
                value={ticket.assignedToId || ''}
                onChange={e => updateMutation.mutate({ assignedToId: e.target.value || null })}
                className="input text-sm"
              >
                <option value="">Unassigned</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>

            {/* Company */}
            {ticket.company && (
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
                  <Building2 size={12} /> Company
                </label>
                <p className="text-sm text-slate-700 font-medium">{ticket.company.name}</p>
              </div>
            )}

            {/* Dates */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Created</span>
                <span className="text-slate-700">{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</span>
              </div>
              {ticket.resolvedAt && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Resolved</span>
                  <span className="text-green-600 font-medium">{format(new Date(ticket.resolvedAt), 'MMM d, yyyy')}</span>
                </div>
              )}
              {ticket.dueDate && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Due</span>
                  <span className="text-orange-600 font-medium">{format(new Date(ticket.dueDate), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Time logged */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Clock size={12} /> Time Logged
            </h3>
            <p className="text-2xl font-bold text-primary-600">{totalHours.toFixed(1)}h</p>
            <p className="text-xs text-slate-400">{ticket.timeEntries?.length || 0} entries</p>
          </div>
        </div>
      </div>
    </div>
  )
}
