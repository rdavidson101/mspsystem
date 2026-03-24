import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ticketRef } from '@/lib/refs'
import { format } from 'date-fns'
import { ArrowLeft, Send, Lock, Unlock, Clock, ChevronDown, Zap, User, Tag, Building2, AlertCircle, History, MessageSquare, AlertTriangle, AtSign, Mail, ArrowUpDown } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/store/authStore'
import UserAvatar from '@/components/ui/UserAvatar'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

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
  AWAITING_TRIAGE: 'bg-violet-100 text-violet-700',
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
  const requesterName = (() => { const r = ticket.createdBy ?? ticket.contact; return r ? `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || 'Customer' : 'Customer' })()
  const currentUserName = user ? `${user.firstName} ${user.lastName}` : 'Support Team'
  return content
    .replace(/\{\{requester_name\}\}/g, requesterName)
    .replace(/\{\{ticket_ref\}\}/g, ticketRef(ticket.number))
    .replace(/\{\{current_user\}\}/g, currentUserName)
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

function detectMention(value: string, cursor: number): { start: number; search: string } | null {
  const before = value.slice(0, cursor)
  for (let i = cursor - 1; i >= 0; i--) {
    const ch = before[i]
    if (ch === '\n' || ch === ' ') return null
    if (ch === '@') {
      const prev = before[i - 1]
      if (i === 0 || /\s/.test(prev)) return { start: i, search: before.slice(i + 1) }
      return null
    }
  }
  return null
}

function renderWithMentions(raw: string) {
  const parts: React.ReactNode[] = []
  const re = /@([A-Za-z]+(?:\s[A-Za-z]+)?)/g
  let last = 0; let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) parts.push(<span key={last}>{raw.slice(last, m.index)}</span>)
    parts.push(<span key={m.index} className="text-primary-700 font-semibold bg-primary-50 px-0.5 rounded">{m[0]}</span>)
    last = m.index + m[0].length
  }
  if (last < raw.length) parts.push(<span key={`t${last}`}>{raw.slice(last)}</span>)
  return parts
}

function CommentBubble({ comment }: { comment: any }) {
  const authorName = comment.user
    ? `${comment.user.firstName} ${comment.user.lastName}`
    : comment.fromName || comment.fromEmail || 'External'

  return (
    <div className={clsx(
      'rounded-lg p-4 border-l-4',
      comment.isInternal
        ? 'bg-orange-50 border-orange-400'
        : 'bg-slate-50 border-slate-200'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <UserAvatar
          user={comment.user ?? { firstName: (comment.fromName || comment.fromEmail || 'External').split(' ')[0], lastName: (comment.fromName || '').split(' ').slice(1).join(' ') || undefined }}
          size="sm"
          showHoverCard={!!comment.user}
        />
        <span className={clsx('text-sm font-medium', comment.isInternal ? 'text-orange-900' : 'text-slate-800')}>
          {authorName}
        </span>
        {comment.isEmail && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-full ml-1">
            <Mail size={9} /> via email
          </span>
        )}
        {comment.isInternal && (
          <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
            <Lock size={10} /> Internal Note
          </span>
        )}
        <span className="text-xs text-slate-400 ml-auto">{format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}</span>
      </div>
      <p className={clsx('text-sm whitespace-pre-wrap', comment.isInternal ? 'text-orange-800' : 'text-slate-700')}>
        {renderWithMentions(comment.content)}
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
  const [activeTab, setActiveTab] = useState<'updates' | 'history'>('updates')
  const [commentSort, setCommentSort] = useState<'asc' | 'desc'>(() =>
    (localStorage.getItem('ticketCommentSort') as 'asc' | 'desc') || 'asc'
  )
  const [closureModal, setClosureModal] = useState<{ targetStatus: string } | null>(null)
  const [closureNote, setClosureNote] = useState('')
  const [mention, setMention] = useState<{ start: number; search: string; top: number; left: number; width: number } | null>(null)
  const [mentionedIds, setMentionedIds] = useState<Set<string>>(new Set())
  const [showMacroPicker, setShowMacroPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mentionPickerRef = useRef<HTMLDivElement>(null)
  const [triageForm, setTriageForm] = useState<{ priority: string; categoryId: string; assignedToId: string }>({
    priority: '',
    categoryId: '',
    assignedToId: '',
  })

  const { data: ticket, refetch } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.get(`/tickets/${id}`).then(r => r.data),
  })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) })
  const { data: macros = [] } = useQuery({ queryKey: ['macros'], queryFn: () => api.get('/macros').then(r => r.data) })
  const { data: internalUsers = [] } = useQuery({ queryKey: ['users', 'INTERNAL'], queryFn: () => api.get('/users', { params: { type: 'INTERNAL' } }).then(r => r.data) })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/tickets/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket', id] }),
  })
  const commentMutation = useMutation({
    mutationFn: (data: any) => api.post(`/tickets/${id}/comments`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ticket', id] }); setComment(''); setMentionedIds(new Set()) },
  })

  function insertMacro(macro: any) {
    const resolved = applyMacroVariables(macro.content, ticket, user)
    setComment(resolved)
    setShowMacroPicker(false)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  // Close mention picker on outside click
  useEffect(() => {
    if (!mention) return
    function handler(e: MouseEvent) {
      if (mentionPickerRef.current && !mentionPickerRef.current.contains(e.target as Node)) setMention(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mention])

  function handleCommentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setComment(val)
    const cursor = e.target.selectionStart ?? val.length
    const detected = detectMention(val, cursor)
    if (detected && textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect()
      setMention({ ...detected, top: rect.top, left: rect.left, width: rect.width })
    } else {
      setMention(null)
    }
  }

  function selectMention(u: any) {
    if (!mention) return
    const displayName = `${u.firstName} ${u.lastName}`
    const before = comment.slice(0, mention.start)
    const after = comment.slice(mention.start + 1 + mention.search.length)
    setComment(`${before}@${displayName} ${after}`)
    setMentionedIds(ids => new Set([...ids, u.id]))
    setMention(null)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const filteredMentions = mention
    ? (internalUsers as any[]).filter((u: any) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(mention.search.toLowerCase())
      ).slice(0, 5)
    : []

  if (!ticket) return (
    <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>
  )

  const totalHours = (ticket.timeEntries || []).reduce((s: number, e: any) => s + e.hours, 0)

  return (
    <>
    <div className="space-y-6">
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
            Opened by <span className="text-slate-600 font-medium">
              {(() => {
                const r = ticket.createdBy ?? ticket.contact
                return r ? `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() : 'Unknown'
              })()}
            </span>
            {' · '}{format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
      </div>

      {ticket.status === 'AWAITING_TRIAGE' && (
        <div className="rounded-xl border-2 border-violet-300 bg-violet-50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center">
              <AlertTriangle size={14} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-violet-900">Awaiting Triage</h3>
              <p className="text-xs text-violet-600">Set the details below then complete triage to open the ticket.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-violet-700 mb-1.5 block">Priority</label>
              <select
                className="input text-sm bg-white"
                value={triageForm.priority || ticket.priority}
                onChange={e => setTriageForm(f => ({ ...f, priority: e.target.value }))}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-violet-700 mb-1.5 block">Category</label>
              <SearchableSelect
                value={triageForm.categoryId || ticket.categoryId || ''}
                onChange={val => setTriageForm(f => ({ ...f, categoryId: val }))}
                options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
                placeholder="Select category"
                emptyLabel="No category"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-violet-700 mb-1.5 block">Assign To</label>
              <SearchableSelect
                value={triageForm.assignedToId || ticket.assignedToId || ''}
                onChange={val => setTriageForm(f => ({ ...f, assignedToId: val }))}
                options={users.map((u: any) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))}
                placeholder="Unassigned"
                emptyLabel="Unassigned"
              />
            </div>
          </div>
          <button
            onClick={() => {
              updateMutation.mutate({
                status: 'OPEN',
                priority: triageForm.priority || ticket.priority,
                categoryId: triageForm.categoryId || ticket.categoryId || undefined,
                assignedToId: triageForm.assignedToId || ticket.assignedToId || undefined,
              }, {
                onSuccess: () => setTriageForm({ priority: '', categoryId: '', assignedToId: '' })
              })
            }}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            Complete Triage → Open Ticket
          </button>
        </div>
      )}

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
              <div className="flex items-center gap-0">
                <button
                  onClick={() => setActiveTab('updates')}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === 'updates' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  )}
                >
                  <MessageSquare size={14} /> Updates
                  <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                    {ticket.comments?.length || 0}
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
                {activeTab === 'updates' && (
                  <button
                    onClick={() => {
                      const next = commentSort === 'asc' ? 'desc' : 'asc'
                      setCommentSort(next)
                      localStorage.setItem('ticketCommentSort', next)
                    }}
                    className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                    title={commentSort === 'asc' ? 'Oldest first — click for newest first' : 'Newest first — click for oldest first'}
                  >
                    <ArrowUpDown size={12} />
                    {commentSort === 'asc' ? 'Oldest first' : 'Newest first'}
                  </button>
                )}
              </div>
            </div>

            <div className="p-5">
              {/* Updates tab: comments only */}
              {activeTab === 'updates' && (
                <div className="space-y-3">
                  {[...(ticket.comments || [])].sort((a: any, b: any) =>
                    commentSort === 'asc'
                      ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  ).map((comment: any) => (
                    <CommentBubble key={`c-${comment.id}`} comment={comment} />
                  ))}
                  {(ticket.comments || []).length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">No updates yet.</p>
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
                <div className="relative">
                  {mention && filteredMentions.length > 0 && (() => {
                    const pickerH = Math.min(filteredMentions.length, 5) * 52 + 40
                    const spaceAbove = mention.top
                    const top = spaceAbove > pickerH + 8 ? mention.top - pickerH - 8 : mention.top + 8
                    return (
                      <div
                        ref={mentionPickerRef}
                        style={{ position: 'fixed', top, left: mention.left, width: mention.width, zIndex: 9999 }}
                        className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                      >
                        <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5 bg-slate-50">
                          <AtSign size={11} className="text-primary-500" />
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Mention a team member</span>
                        </div>
                        {filteredMentions.map((u: any) => (
                          <button
                            key={u.id}
                            onMouseDown={e => { e.preventDefault(); selectMention(u) }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary-50 transition-colors text-left"
                          >
                            <UserAvatar user={u} size="sm" showHoverCard={false} />
                            <div>
                              <p className="text-sm font-medium text-slate-800">{u.firstName} {u.lastName}</p>
                              <p className="text-xs text-slate-400">{u.jobTitle || u.role}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  })()}
                  <textarea
                    ref={textareaRef}
                    value={comment}
                    onChange={handleCommentChange}
                    placeholder={isInternal ? 'Add an internal note...' : 'Write a reply...'}
                    className={clsx(
                      'w-full px-4 py-3 text-sm outline-none resize-none bg-transparent',
                      isInternal ? 'text-orange-900 placeholder-orange-300' : 'text-slate-700 placeholder-slate-400'
                    )}
                    rows={4}
                  />
                </div>
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
                    onClick={() => commentMutation.mutate({ content: comment, isInternal, mentionedUserIds: [...mentionedIds] })}
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
              {(() => {
                const reporter = ticket.createdBy ?? ticket.contact
                return (
                  <div className="flex items-center gap-2">
                    <UserAvatar user={reporter} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {reporter ? `${reporter.firstName ?? ''} ${reporter.lastName ?? ''}`.trim() : 'Unknown'}
                      </p>
                      {reporter?.email && <p className="text-xs text-slate-400">{reporter.email}</p>}
                      {reporter?.phone && <p className="text-xs text-slate-400">{reporter.phone}</p>}
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Status */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Status</label>
              <select
                value={ticket.status}
                onChange={e => {
                  const newStatus = e.target.value
                  if ((newStatus === 'RESOLVED' || newStatus === 'CLOSED') && ticket.status !== newStatus) {
                    setClosureNote('')
                    setClosureModal({ targetStatus: newStatus })
                  } else {
                    updateMutation.mutate({ status: newStatus })
                  }
                }}
                className="input text-sm"
              >
                {['AWAITING_TRIAGE', 'OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED'].map(s => (
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

            {/* Service Team */}
            {ticket.serviceTeam && (
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
                  Service Team
                </label>
                <span className="badge text-xs bg-indigo-50 text-indigo-700 border border-indigo-100">{ticket.serviceTeam.name}</span>
              </div>
            )}

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
              <SearchableSelect
                value={ticket.categoryId || ''}
                onChange={val => updateMutation.mutate({ categoryId: val || null })}
                options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
                placeholder="No category"
                emptyLabel="No category"
              />
            </div>

            {/* Assigned To */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Assigned To</label>
              <SearchableSelect
                value={ticket.assignedToId || ''}
                onChange={val => updateMutation.mutate({ assignedToId: val || null })}
                options={users.map((u: any) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))}
                placeholder="Unassigned"
                emptyLabel="Unassigned"
              />
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

    {/* Closure confirmation modal */}
    {closureModal && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">
              {closureModal.targetStatus === 'RESOLVED' ? 'Resolve Ticket' : 'Close Ticket'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Please confirm the issue has been resolved before closing.
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <strong>Reminder:</strong> Only close this ticket once you have confirmed the issue is fully resolved with the end user.
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Closure note <span className="text-slate-400">(sent to the end user)</span>
              </label>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={4}
                placeholder="Describe the resolution, e.g. 'Replaced faulty network cable. Issue confirmed resolved with user.'"
                value={closureNote}
                onChange={e => setClosureNote(e.target.value)}
                autoFocus
              />
            </div>
            <p className="text-xs text-slate-400">
              The end user will receive an email confirming closure. If they reply, the ticket will be automatically reopened.
            </p>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              className="btn btn-secondary"
              onClick={() => setClosureModal(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={updateMutation.isPending}
              onClick={() => {
                updateMutation.mutate(
                  { status: closureModal.targetStatus, closureNote: closureNote.trim() || 'Your ticket has been resolved. Thank you for contacting us.' },
                  { onSuccess: () => setClosureModal(null) }
                )
              }}
            >
              {closureModal.targetStatus === 'RESOLVED' ? 'Resolve & Notify' : 'Close & Notify'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
