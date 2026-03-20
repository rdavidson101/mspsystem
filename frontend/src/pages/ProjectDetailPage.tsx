import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ticketRef, changeRef } from '@/lib/refs'
import { useAuthStore } from '@/store/authStore'
import {
  ArrowLeft, Plus, ChevronDown, ChevronRight, GripVertical,
  Play, Pause, LayoutList, Trash2, UserPlus, X, Check,
  FolderKanban, Clock, Timer, Search, AtSign, Settings,
  CheckCircle2, Calendar, DollarSign, AlertTriangle
} from 'lucide-react'
import clsx from 'clsx'
import { format, formatDistanceToNow } from 'date-fns'
import UserAvatar from '@/components/ui/UserAvatar'
import {
  DndContext, DragEndEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  NOT_STARTED:          { label: 'Not Started',          color: 'text-slate-600',  bg: 'bg-slate-100',   dot: 'bg-slate-400'  },
  WORKING_ON_IT:        { label: 'Working On It',        color: 'text-orange-700', bg: 'bg-orange-100',  dot: 'bg-orange-500' },
  STUCK:                { label: 'Stuck',                color: 'text-red-700',    bg: 'bg-red-100',     dot: 'bg-red-500'    },
  DONE:                 { label: 'Done',                 color: 'text-green-700',  bg: 'bg-green-100',   dot: 'bg-green-500'  },
  SERVICE_NOT_REQUIRED: { label: 'Service Not Required', color: 'text-purple-700', bg: 'bg-purple-100',  dot: 'bg-purple-500' },
}
const STATUSES = Object.keys(STATUS_CONFIG)
const SECTION_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6']

const PROJECT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  PLANNING:    { label: 'Planning',    color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-200', dot: 'bg-indigo-500'  },
  IN_PROGRESS: { label: 'In Progress', color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200', dot: 'bg-orange-500'  },
  ON_HOLD:     { label: 'On Hold',     color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200', dot: 'bg-yellow-500'  },
  COMPLETED:   { label: 'Completed',   color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200',  dot: 'bg-green-500'   },
  CANCELLED:   { label: 'Cancelled',   color: 'text-slate-600',  bg: 'bg-slate-100',  border: 'border-slate-200',  dot: 'bg-slate-400'   },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2,'0')}s`
  return `${s}s`
}

function formatHours(hours: number) {
  if (!hours) return null
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

// ── Mention helpers ───────────────────────────────────────────────────────────
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

// Highlights @Name patterns — also converts legacy @[Name](userId) tokens to plain @Name first
function renderMentions(raw: string) {
  const normalized = raw.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')
  const parts: React.ReactNode[] = []
  const re = /@([A-Za-z]+(?:\s[A-Za-z]+)?)/g
  let last = 0; let m: RegExpExecArray | null
  while ((m = re.exec(normalized)) !== null) {
    if (m.index > last) parts.push(<span key={last}>{normalized.slice(last, m.index)}</span>)
    parts.push(<span key={m.index} className="text-primary-700 font-semibold bg-primary-50 px-0.5 rounded">{m[0]}</span>)
    last = m.index + m[0].length
  }
  if (last < normalized.length) parts.push(<span key={`t${last}`}>{normalized.slice(last)}</span>)
  return parts
}

// ── Floating dropdown portal using fixed positioning ──────────────────────────
function Dropdown({ trigger, children, open, onClose }: {
  trigger: React.RefObject<HTMLElement>
  children: React.ReactNode
  open: boolean
  onClose: () => void
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && trigger.current) {
      const rect = trigger.current.getBoundingClientRect()
      const dropH = dropRef.current?.offsetHeight || 200
      const spaceBelow = window.innerHeight - rect.bottom
      const top = spaceBelow > dropH ? rect.bottom + 4 : rect.top - dropH - 4
      setPos({ top, left: rect.left })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) &&
          trigger.current && !trigger.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={dropRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      className="bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-w-[160px] max-h-64 overflow-y-auto"
    >
      {children}
    </div>
  )
}

// ── Timer hook ────────────────────────────────────────────────────────────────
function useTimer(taskId: string, userId: string, onRefresh: () => void) {
  const qc = useQueryClient()
  const [elapsed, setElapsed] = useState(0)
  const [timerError, setTimerError] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  const { data, refetch } = useQuery({
    queryKey: ['timer', taskId, userId],
    queryFn: () => api.get(`/tasks/${taskId}/timer`).then(r => r.data),
    refetchInterval: 60000,
  })

  const timer = data?.timer
  const totalHours: number = data?.totalHours || 0
  const isRunning = !!timer

  useEffect(() => {
    if (timer?.startedAt) {
      const update = () => setElapsed(Math.floor((Date.now() - new Date(timer.startedAt).getTime()) / 1000))
      update()
      intervalRef.current = setInterval(update, 1000)
    } else {
      setElapsed(0)
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [timer?.startedAt])

  const startMut = useMutation({
    mutationFn: () => api.post(`/tasks/${taskId}/timer/start`).then(r => r.data),
    onSuccess: () => { refetch(); setTimerError('') },
    onError: (e: any) => setTimerError(e.response?.data?.message || 'Failed to start timer'),
  })

  const stopMut = useMutation({
    mutationFn: () => api.post(`/tasks/${taskId}/timer/stop`).then(r => r.data),
    onSuccess: () => { refetch(); onRefresh(); setTimerError('') },
    onError: (e: any) => setTimerError(e.response?.data?.message || 'Failed to save timer'),
  })

  return {
    isRunning, elapsed, totalHours, timerError,
    start: () => startMut.mutate(),
    stop: () => stopMut.mutate(),
    isPending: startMut.isPending || stopMut.isPending,
  }
}

// ── Task row ──────────────────────────────────────────────────────────────────
interface TaskRowProps {
  task: any
  depth?: number
  projectMembers: any[]
  onOpenComments: (task: any) => void
  onRefresh: () => void
}

function TaskRow({ task, depth = 0, projectMembers, onOpenComments, onRefresh }: TaskRowProps) {
  const { user } = useAuthStore()
  const [expanded, setExpanded] = useState(true)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState(task.title)
  const [showAssignee, setShowAssignee] = useState(false)
  const [showStatus, setShowStatus] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const assigneeRef = useRef<HTMLButtonElement>(null)
  const statusRef = useRef<HTMLButtonElement>(null)
  const hasSubtasks = task.subTasks?.length > 0
  const { isRunning, elapsed, totalHours, timerError, start, stop, isPending } = useTimer(task.id, user!.id, onRefresh)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  const updateMut = useMutation({
    mutationFn: (data: any) => api.patch(`/tasks/${task.id}`, data).then(r => r.data),
    onSuccess: () => onRefresh(),
  })
  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/tasks/${task.id}`).then(r => r.data),
    onSuccess: () => onRefresh(),
  })
  const addSubtaskMut = useMutation({
    mutationFn: () => api.post('/tasks', {
      title: 'New Subtask', projectId: task.projectId, sectionId: task.sectionId,
      parentTaskId: task.id, status: 'NOT_STARTED',
    }).then(r => r.data),
    onSuccess: () => { setExpanded(true); onRefresh() },
  })

  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.NOT_STARTED
  const commentCount = task._count?.comments || 0
  const assignees: any[] = task.assignees || []
  const assigneeIds = new Set(assignees.map((a: any) => a.user.id))

  function toggleAssignee(uid: string) {
    const newIds = assigneeIds.has(uid)
      ? [...assigneeIds].filter(id => id !== uid)
      : [...assigneeIds, uid]
    updateMut.mutate({ assigneeIds: newIds })
  }

  const filteredMembers = projectMembers.filter((m: any) =>
    `${m.user.firstName} ${m.user.lastName}`.toLowerCase().includes(assigneeSearch.toLowerCase())
  )

  const showTimer = !hasSubtasks || depth > 0

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={clsx(
          'flex items-center group border-b border-slate-100 hover:bg-slate-50/80 transition-colors min-w-0',
          depth > 0 && 'bg-slate-50/50'
        )}
      >
        {/* Depth indent */}
        {depth > 0 && <div style={{ width: depth * 20 }} className="flex-shrink-0 border-l-2 border-slate-200 ml-4 self-stretch" />}

        {/* Drag handle */}
        <div {...attributes} {...listeners}
          className="px-2 py-3 cursor-grab text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 flex-shrink-0">
          <GripVertical size={14} />
        </div>

        {/* Expand */}
        <div className="w-5 flex-shrink-0 flex items-center justify-center">
          {hasSubtasks && (
            <button onClick={() => setExpanded(e => !e)} className="text-slate-400 hover:text-slate-600">
              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          )}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0 py-2 pr-2" style={{ minWidth: 160 }}>
          {editingTitle ? (
            <input
              autoFocus
              className="w-full text-sm bg-white border border-primary-300 rounded px-2 py-0.5 outline-none"
              value={titleVal}
              onChange={e => setTitleVal(e.target.value)}
              onBlur={() => { updateMut.mutate({ title: titleVal }); setEditingTitle(false) }}
              onKeyDown={e => {
                if (e.key === 'Enter') { updateMut.mutate({ title: titleVal }); setEditingTitle(false) }
                if (e.key === 'Escape') { setTitleVal(task.title); setEditingTitle(false) }
              }}
            />
          ) : (
            <>
              <span
                className={clsx('text-sm cursor-pointer hover:text-primary-600 block truncate', (task.status === 'DONE' || task.status === 'SERVICE_NOT_REQUIRED') && 'line-through text-slate-400')}
                onDoubleClick={() => setEditingTitle(true)}
                title={task.title}
              >
                {task.title}
              </span>
              {task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' && task.status !== 'SERVICE_NOT_REQUIRED' && (
                <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 mt-0.5">
                  Overdue
                </span>
              )}
            </>
          )}
        </div>

        {/* Assignees — multi-select */}
        <div className="w-32 flex-shrink-0 px-1">
          <button
            ref={assigneeRef}
            onClick={() => setShowAssignee(s => !s)}
            className="flex items-center gap-0.5 px-1 py-1 hover:bg-slate-100 rounded w-full min-h-[28px]"
          >
            {assignees.length > 0 ? (
              <div className="flex -space-x-1.5">
                {assignees.slice(0, 3).map((a: any) => (
                  <UserAvatar key={a.user.id} user={a.user} size="xs" />
                ))}
                {assignees.length > 3 && (
                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-medium">
                    +{assignees.length - 3}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-400 flex items-center gap-1"><UserPlus size={11} /> Assign</span>
            )}
          </button>
          <Dropdown trigger={assigneeRef as React.RefObject<HTMLElement>} open={showAssignee} onClose={() => { setShowAssignee(false); setAssigneeSearch('') }}>
            <div className="px-2 py-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <Search size={11} className="text-slate-400 flex-shrink-0" />
                <input
                  autoFocus
                  placeholder="Search users…"
                  value={assigneeSearch}
                  onChange={e => setAssigneeSearch(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 text-xs bg-transparent outline-none text-slate-700 placeholder-slate-400 min-w-0"
                />
              </div>
            </div>
            {filteredMembers.length === 0 && (
              <div className="px-3 py-2 text-xs text-slate-400">No users found</div>
            )}
            {filteredMembers.map((m: any) => {
              const isAssigned = assigneeIds.has(m.user.id)
              return (
                <button
                  key={m.user.id}
                  onClick={() => toggleAssignee(m.user.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  <UserAvatar user={m.user} size="xs" showHoverCard={false} />
                  <span className="flex-1 text-left">{m.user.firstName} {m.user.lastName}</span>
                  {isAssigned && <Check size={12} className="text-primary-600" />}
                </button>
              )
            })}
          </Dropdown>
        </div>

        {/* Status */}
        <div className="w-36 flex-shrink-0 px-1">
          <button
            ref={statusRef}
            onClick={() => setShowStatus(s => !s)}
            className={clsx('flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium w-full justify-center', statusCfg.bg, statusCfg.color)}
          >
            <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', statusCfg.dot)} />
            <span className="truncate">{statusCfg.label}</span>
          </button>
          <Dropdown trigger={statusRef as React.RefObject<HTMLElement>} open={showStatus} onClose={() => setShowStatus(false)}>
            {STATUSES.map(s => {
              const cfg = STATUS_CONFIG[s]
              return (
                <button
                  key={s}
                  onClick={() => { updateMut.mutate({ status: s }); setShowStatus(false) }}
                  className={clsx('w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50', cfg.color)}
                >
                  <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
                  <span className="flex-1 text-left">{cfg.label}</span>
                  {task.status === s && <Check size={12} />}
                </button>
              )
            })}
          </Dropdown>
        </div>

        {/* Start date */}
        <div className="w-28 flex-shrink-0 px-1">
          <input
            type="date"
            value={task.startDate ? format(new Date(task.startDate), 'yyyy-MM-dd') : ''}
            onChange={e => updateMut.mutate({ startDate: e.target.value || null })}
            className="w-full text-xs text-slate-500 border border-transparent hover:border-slate-200 focus:border-primary-300 rounded px-1.5 py-1 outline-none bg-transparent cursor-pointer"
            title="Start date"
          />
        </div>

        {/* Due date */}
        <div className="w-28 flex-shrink-0 px-1">
          <input
            type="date"
            value={task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''}
            onChange={e => updateMut.mutate({ dueDate: e.target.value || null })}
            className={clsx(
              'w-full text-xs border border-transparent hover:border-slate-200 focus:border-primary-300 rounded px-1.5 py-1 outline-none bg-transparent cursor-pointer',
              task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' && task.status !== 'SERVICE_NOT_REQUIRED'
                ? 'text-red-500 font-medium'
                : 'text-slate-500'
            )}
            title="Due date"
          />
        </div>

        {/* Timer */}
        <div className="w-32 flex-shrink-0 px-1">
          {showTimer ? (
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => isRunning ? stop() : start()}
                  disabled={isPending}
                  className={clsx(
                    'p-1 rounded transition-colors flex-shrink-0',
                    isRunning ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                    isPending && 'opacity-50 cursor-not-allowed'
                  )}
                  title={isRunning ? 'Pause & save' : 'Start timer'}
                >
                  {isRunning ? <Pause size={11} /> : <Play size={11} />}
                </button>
                <div>
                  <span className={clsx('text-xs font-mono tabular-nums block', isRunning ? 'text-orange-600 font-semibold' : 'text-slate-400')}>
                    {isRunning ? formatDuration(elapsed) : formatHours(totalHours) || '—'}
                  </span>
                  {isRunning && totalHours > 0 && (
                    <span className="text-xs text-slate-400 block">{formatHours(totalHours)} total</span>
                  )}
                  {task.estimatedHours && (
                    <span className="text-xs text-slate-400 block">/ {task.estimatedHours}h est</span>
                  )}
                </div>
              </div>
              {timerError && <span className="text-xs text-red-500 mt-0.5">{timerError}</span>}
            </div>
          ) : (
            <span className="text-xs text-slate-300 px-2">—</span>
          )}
        </div>

        {/* Details */}
        <div className="w-12 flex-shrink-0 flex justify-center">
          <button
            onClick={() => onOpenComments(task)}
            title="Open details"
            className="flex items-center gap-0.5 text-slate-400 hover:text-primary-600 transition-colors px-1"
          >
            <LayoutList size={13} />
            {commentCount > 0 && <span className="text-xs">{commentCount}</span>}
          </button>
        </div>

        {/* Actions */}
        <div className="w-16 flex-shrink-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
          {!hasSubtasks && depth === 0 && (
            <button
              onClick={() => addSubtaskMut.mutate()}
              className="p-1 text-slate-400 hover:text-primary-600 rounded"
              title="Add subtask"
            >
              <Plus size={13} />
            </button>
          )}
          <button
            onClick={() => { if (confirm('Delete this task?')) deleteMut.mutate() }}
            className="p-1 text-slate-400 hover:text-red-500 rounded"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Subtasks */}
      {expanded && hasSubtasks && (
        <SortableContext items={task.subTasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
          {task.subTasks.map((sub: any) => (
            <TaskRow
              key={sub.id}
              task={sub}
              depth={depth + 1}
              projectMembers={projectMembers}
              onOpenComments={onOpenComments}
              onRefresh={onRefresh}
            />
          ))}
        </SortableContext>
      )}
    </>
  )
}

// ── Section block ──────────────────────────────────────────────────────────────
function SectionBlock({ section, projectMembers, onOpenComments, onRefresh, projectId }: {
  section: any; projectMembers: any[]; onOpenComments: (t: any) => void; onRefresh: () => void; projectId: string
}) {
  const [collapsed, setCollapsed] = useState(section.collapsed || false)
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(section.name)

  const updateSectionMut = useMutation({
    mutationFn: (data: any) => api.patch(`/projects/${projectId}/sections/${section.id}`, data).then(r => r.data),
    onSuccess: () => onRefresh(),
  })
  const deleteSectionMut = useMutation({
    mutationFn: () => api.delete(`/projects/${projectId}/sections/${section.id}`).then(r => r.data),
    onSuccess: () => onRefresh(),
  })
  const addTaskMut = useMutation({
    mutationFn: () => api.post('/tasks', { title: 'New Task', projectId, sectionId: section.id, status: 'NOT_STARTED' }).then(r => r.data),
    onSuccess: () => onRefresh(),
  })

  const tasks = section.tasks || []
  const doneCount = tasks.filter((t: any) => t.status === 'DONE' || t.status === 'SERVICE_NOT_REQUIRED').length

  return (
    <div className="mb-8">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1 group/section">
        <button
          onClick={() => { setCollapsed(c => !c); updateSectionMut.mutate({ collapsed: !collapsed }) }}
          className="text-slate-400 hover:text-slate-600 flex-shrink-0"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: section.color }} />
        {editingName ? (
          <input
            autoFocus
            className="text-sm font-semibold bg-white border border-primary-300 rounded px-2 py-0.5 outline-none"
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={() => { updateSectionMut.mutate({ name: nameVal }); setEditingName(false) }}
            onKeyDown={e => {
              if (e.key === 'Enter') { updateSectionMut.mutate({ name: nameVal }); setEditingName(false) }
              if (e.key === 'Escape') setEditingName(false)
            }}
          />
        ) : (
          <span
            className="text-sm font-semibold text-slate-700 cursor-pointer hover:text-slate-900"
            onDoubleClick={() => setEditingName(true)}
          >
            {section.name}
          </span>
        )}
        <span className="text-xs text-slate-400">{doneCount}/{tasks.length}</span>
        <div className="opacity-0 group-hover/section:opacity-100 flex items-center gap-2 ml-2">
          <button
            onClick={() => addTaskMut.mutate()}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            <Plus size={12} /> Add Task
          </button>
          <button
            onClick={() => { if (confirm('Delete this section and all its tasks?')) deleteSectionMut.mutate() }}
            className="text-slate-400 hover:text-red-500"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Task table */}
      {!collapsed && (
        <>
          {/* Column headers */}
          <div className="flex items-center border-b border-t border-slate-200 bg-slate-50 text-xs font-medium text-slate-400 uppercase tracking-wide overflow-x-auto">
            <div className="w-10 flex-shrink-0" />
            <div className="w-5 flex-shrink-0" />
            <div className="flex-1 py-2 pr-2" style={{ minWidth: 160 }}>Task</div>
            <div className="w-32 flex-shrink-0 py-2">Assignees</div>
            <div className="w-36 flex-shrink-0 py-2 text-center">Status</div>
            <div className="w-28 flex-shrink-0 py-2 px-1">Start</div>
            <div className="w-28 flex-shrink-0 py-2 px-1">Due</div>
            <div className="w-32 flex-shrink-0 py-2 px-1">Timer</div>
            <div className="w-12 flex-shrink-0 py-2 text-center">Details</div>
            <div className="w-16 flex-shrink-0" />
          </div>

          {/* Task rows — NO overflow-hidden so dropdowns aren't clipped */}
          <div className="border border-slate-200 rounded-b-lg border-t-0">
            <SortableContext items={tasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
              {tasks.map((task: any) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  projectMembers={projectMembers}
                  onOpenComments={onOpenComments}
                  onRefresh={onRefresh}
                />
              ))}
            </SortableContext>
            {tasks.length === 0 && (
              <div className="py-5 text-center text-slate-400 text-sm">No tasks — add one below</div>
            )}
            <button
              onClick={() => addTaskMut.mutate()}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:text-primary-600 hover:bg-primary-50/50 transition-colors border-t border-slate-100 rounded-b-lg"
            >
              <Plus size={14} /> Add task
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Task detail modal ──────────────────────────────────────────────────────────
function TaskDetailModal({ task: initialTask, projectMembers, onClose, onRefresh }: {
  task: any; projectMembers: any[]; onClose: () => void; onRefresh: () => void
}) {
  const { user } = useAuthStore()
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState(initialTask.title)
  const [showStatus, setShowStatus] = useState(false)
  const [showAssignees, setShowAssignees] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [mention, setMention] = useState<{ start: number; search: string; top: number; left: number; width: number } | null>(null)
  const [mentionedIds, setMentionedIds] = useState<Set<string>>(new Set())
  const [references, setReferences] = useState<Array<{type: string; id: string; label: string; link: string}>>([])
  const [showRefPicker, setShowRefPicker] = useState(false)
  const [refTab, setRefTab] = useState<'ticket'|'change'|'asset'>('ticket')
  const [refSearch, setRefSearch] = useState('')
  const [showLogTime, setShowLogTime] = useState(false)
  const [logHours, setLogHours] = useState('')
  const [logDesc, setLogDesc] = useState('')
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0])
  const statusRef = useRef<HTMLButtonElement>(null)
  const assigneeRef = useRef<HTMLButtonElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mentionPickerRef = useRef<HTMLDivElement>(null)

  // Fresh task data
  const { data: task = initialTask, refetch: refetchTask } = useQuery({
    queryKey: ['task-detail', initialTask.id],
    queryFn: () => api.get(`/tasks/${initialTask.id}`).then(r => r.data),
  })

  // Per-user time breakdown
  const { data: timeByUser = [], refetch: refetchTime } = useQuery({
    queryKey: ['task-time-by-user', initialTask.id],
    queryFn: () => api.get(`/tasks/${initialTask.id}/time-by-user`).then(r => r.data),
  })

  const { data: timeEntries = [], refetch: refetchEntries } = useQuery({
    queryKey: ['task-time-entries', initialTask.id],
    queryFn: () => api.get(`/tasks/${initialTask.id}/time-entries`).then(r => r.data),
  })

  const addTimeMut = useMutation({
    mutationFn: (data: any) => api.post(`/tasks/${initialTask.id}/time-entries`, data).then(r => r.data),
    onSuccess: () => { refetchEntries(); refetchTime(); setShowLogTime(false); setLogHours(''); setLogDesc(''); setLogDate(new Date().toISOString().split('T')[0]) },
  })

  const deleteTimeMut = useMutation({
    mutationFn: (entryId: string) => api.delete(`/tasks/${initialTask.id}/time-entries/${entryId}`).then(r => r.data),
    onSuccess: () => { refetchEntries(); refetchTime() },
  })

  // Comments
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['task-comments', initialTask.id],
    queryFn: () => api.get(`/tasks/${initialTask.id}/comments`).then(r => r.data),
  })

  const updateMut = useMutation({
    mutationFn: (data: any) => api.patch(`/tasks/${initialTask.id}`, data).then(r => r.data),
    onSuccess: () => { refetchTask(); refetchTime(); onRefresh() },
  })
  const addCommentMut = useMutation({
    mutationFn: (content: string) => api.post(`/tasks/${initialTask.id}/comments`, { content }).then(r => r.data),
    onSuccess: () => { refetchComments(); setText(''); setImages([]); setMentionedIds(new Set()); setReferences([]) },
  })
  const deleteCommentMut = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${initialTask.id}/comments/${id}`).then(r => r.data),
    onSuccess: () => refetchComments(),
  })

  // Attachments
  const { data: attachments = [], refetch: refetchAttachments } = useQuery({
    queryKey: ['task-attachments', initialTask.id],
    queryFn: () => api.get(`/tasks/${initialTask.id}/attachments`).then(r => r.data),
  })
  const uploadAttachmentMut = useMutation({
    mutationFn: (data: any) => api.post(`/tasks/${initialTask.id}/attachments`, data).then(r => r.data),
    onSuccess: () => refetchAttachments(),
  })
  const deleteAttachmentMut = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${initialTask.id}/attachments/${id}`).then(r => r.data),
    onSuccess: () => refetchAttachments(),
  })

  const { data: ticketResults = [] } = useQuery({
    queryKey: ['ref-search-tickets', refSearch],
    queryFn: () => refSearch.length >= 2 ? api.get('/tickets', { params: { search: refSearch } }).then(r => r.data) : [],
    enabled: showRefPicker && refTab === 'ticket' && refSearch.length >= 2,
  })
  const { data: changeResults = [] } = useQuery({
    queryKey: ['ref-search-changes', refSearch],
    queryFn: () => refSearch.length >= 2 ? api.get('/changes', { params: { search: refSearch } }).then(r => r.data) : [],
    enabled: showRefPicker && refTab === 'change' && refSearch.length >= 2,
  })
  const { data: assetResults = [] } = useQuery({
    queryKey: ['ref-search-assets', refSearch],
    queryFn: () => refSearch.length >= 2 ? api.get('/inventory/assets', { params: { search: refSearch } }).then(r => r.data) : [],
    enabled: showRefPicker && refTab === 'asset' && refSearch.length >= 2,
  })

  // Close mention picker on outside click
  useEffect(() => {
    if (!mention) return
    function handler(e: MouseEvent) {
      if (mentionPickerRef.current && !mentionPickerRef.current.contains(e.target as Node)) {
        setMention(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mention])

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setText(val)
    const cursor = e.target.selectionStart ?? val.length
    const detected = detectMention(val, cursor)
    if (detected && textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect()
      setMention({ ...detected, top: rect.top, left: rect.left, width: rect.width })
    } else {
      setMention(null)
    }
  }

  function selectMention(member: any) {
    if (!mention) return
    const displayName = `${member.user.firstName} ${member.user.lastName}`
    const before = text.slice(0, mention.start)
    const after = text.slice(mention.start + 1 + mention.search.length)
    setText(`${before}@${displayName} ${after}`)
    setMentionedIds(ids => new Set([...ids, member.user.id]))
    setMention(null)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  function handlePaste(e: React.ClipboardEvent) {
    Array.from(e.clipboardData.items).forEach(item => {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (!file) return
        const reader = new FileReader()
        reader.onload = ev => setImages(imgs => [...imgs, ev.target?.result as string])
        reader.readAsDataURL(file)
      }
    })
  }
  function handleCombinedFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files || []).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        const result = ev.target?.result as string
        if (file.type.startsWith('image/')) {
          // Add to inline comment images
          setImages(imgs => [...imgs, result])
        } else {
          // Upload directly as task attachment
          uploadAttachmentMut.mutate({
            name: file.name,
            url: result,
            size: file.size,
            mimeType: file.type,
          })
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }
  function submit() {
    if (!text.trim() && images.length === 0) return
    addCommentMut.mutate(JSON.stringify({ text: text.trim(), images, mentionedIds: [...mentionedIds], references }))
  }
  function parseContent(raw: string) {
    try { return JSON.parse(raw) } catch { return { text: raw, images: [] } }
  }

  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.NOT_STARTED
  const assignees: any[] = task.assignees || []
  const assigneeIds = new Set(assignees.map((a: any) => a.user.id))
  const totalTracked: number = timeByUser.reduce((sum: number, e: any) => sum + e.hours, 0)

  const filteredMembers = projectMembers.filter((m: any) =>
    `${m.user.firstName} ${m.user.lastName}`.toLowerCase().includes(assigneeSearch.toLowerCase())
  )

  function toggleAssignee(uid: string) {
    const newIds = assigneeIds.has(uid)
      ? [...assigneeIds].filter(id => id !== uid)
      : [...assigneeIds, uid]
    updateMut.mutate({ assigneeIds: newIds })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex overflow-hidden" style={{ maxHeight: '88vh' }}>

        {/* ── LEFT: Task details ── */}
        <div className="w-80 flex-shrink-0 border-r border-slate-200 flex flex-col bg-slate-50/60 overflow-y-auto">

          {/* Title block */}
          <div className="p-5 bg-white border-b border-slate-200">
            {editingTitle ? (
              <textarea
                autoFocus
                rows={3}
                className="w-full text-[15px] font-semibold text-slate-900 border border-primary-300 rounded-lg px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-primary-200"
                value={titleVal}
                onChange={e => setTitleVal(e.target.value)}
                onBlur={() => { updateMut.mutate({ title: titleVal }); setEditingTitle(false) }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); updateMut.mutate({ title: titleVal }); setEditingTitle(false) }
                  if (e.key === 'Escape') { setTitleVal(task.title); setEditingTitle(false) }
                }}
              />
            ) : (
              <h2
                className="text-[15px] font-semibold text-slate-900 cursor-pointer hover:text-primary-700 leading-snug"
                onClick={() => { setTitleVal(task.title); setEditingTitle(true) }}
                title="Click to edit title"
              >
                {task.title}
              </h2>
            )}
            {task.section && (
              <div className="flex items-center gap-1.5 mt-2.5">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: task.section.color }} />
                <span className="text-xs text-slate-400 font-medium">{task.section.name}</span>
              </div>
            )}
          </div>

          <div className="flex-1 p-5 space-y-6">

            {/* Status */}
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Status</p>
              <button
                ref={statusRef}
                onClick={() => setShowStatus(s => !s)}
                className={clsx('flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold w-full', statusCfg.bg, statusCfg.color)}
              >
                <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', statusCfg.dot)} />
                <span className="flex-1 text-left">{statusCfg.label}</span>
                <ChevronDown size={14} />
              </button>
              <Dropdown trigger={statusRef as React.RefObject<HTMLElement>} open={showStatus} onClose={() => setShowStatus(false)}>
                {STATUSES.map(s => {
                  const cfg = STATUS_CONFIG[s]
                  return (
                    <button
                      key={s}
                      onClick={() => { updateMut.mutate({ status: s }); setShowStatus(false) }}
                      className={clsx('w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50', cfg.color)}
                    >
                      <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
                      <span className="flex-1 text-left font-medium">{cfg.label}</span>
                      {task.status === s && <Check size={12} />}
                    </button>
                  )
                })}
              </Dropdown>
            </div>

            {/* Assignees */}
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Assignees</p>
              <button
                ref={assigneeRef}
                onClick={() => setShowAssignees(s => !s)}
                className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 hover:border-primary-300 rounded-xl w-full min-h-[42px] transition-colors"
              >
                {assignees.length > 0 ? (
                  <>
                    <div className="flex -space-x-2 flex-1">
                      {assignees.slice(0, 5).map((a: any) => (
                        <UserAvatar key={a.user.id} user={a.user} size="xs" />
                      ))}
                      {assignees.length > 5 && (
                        <div className="w-6 h-6 rounded-full bg-slate-200 ring-2 ring-white flex items-center justify-center text-slate-600 text-xs font-bold">
                          +{assignees.length - 5}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">{assignees.length} assigned</span>
                  </>
                ) : (
                  <span className="text-sm text-slate-400 flex items-center gap-1.5">
                    <UserPlus size={13} /> Add assignee
                  </span>
                )}
              </button>
              <Dropdown trigger={assigneeRef as React.RefObject<HTMLElement>} open={showAssignees} onClose={() => { setShowAssignees(false); setAssigneeSearch('') }}>
                <div className="px-2 py-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
                    <Search size={12} className="text-slate-400 flex-shrink-0" />
                    <input
                      autoFocus
                      placeholder="Search users…"
                      value={assigneeSearch}
                      onChange={e => setAssigneeSearch(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400 min-w-0"
                    />
                  </div>
                </div>
                {filteredMembers.length === 0 && (
                  <div className="px-3 py-3 text-sm text-slate-400">No users found</div>
                )}
                {filteredMembers.map((m: any) => {
                  const isAssigned = assigneeIds.has(m.user.id)
                  return (
                    <button
                      key={m.user.id}
                      onClick={() => toggleAssignee(m.user.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <UserAvatar user={m.user} size="xs" showHoverCard={false} />
                      <span className="flex-1 text-left">{m.user.firstName} {m.user.lastName}</span>
                      <div className={clsx('w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors',
                        isAssigned ? 'bg-primary-500 text-white' : 'border border-slate-300'
                      )}>
                        {isAssigned && <Check size={10} />}
                      </div>
                    </button>
                  )
                })}
              </Dropdown>
              {/* Assignee name list */}
              {assignees.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  {assignees.map((a: any) => (
                    <div key={a.user.id} className="flex items-center gap-2 text-sm text-slate-600">
                      <UserAvatar user={a.user} size="xs" />
                      <span>{a.user.firstName} {a.user.lastName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Start Date</p>
                <input
                  type="date"
                  value={task.startDate ? format(new Date(task.startDate), 'yyyy-MM-dd') : ''}
                  onChange={e => updateMut.mutate({ startDate: e.target.value || null })}
                  className="w-full text-sm text-slate-700 border border-slate-200 hover:border-slate-300 focus:border-primary-300 rounded-xl px-2.5 py-2 outline-none bg-white"
                />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Due Date</p>
                <input
                  type="date"
                  value={task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''}
                  onChange={e => updateMut.mutate({ dueDate: e.target.value || null })}
                  className={clsx(
                    'w-full text-sm border border-slate-200 hover:border-slate-300 focus:border-primary-300 rounded-xl px-2.5 py-2 outline-none bg-white',
                    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' && task.status !== 'SERVICE_NOT_REQUIRED'
                      ? 'text-red-500 font-semibold border-red-200' : 'text-slate-700'
                  )}
                />
              </div>
            </div>

            {/* Estimated Hours */}
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Estimated Hours</p>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={task.estimatedHours ?? ''}
                  onChange={e => updateMut.mutate({ estimatedHours: e.target.value ? Number(e.target.value) : null })}
                  placeholder="e.g. 8"
                  className="w-full border border-slate-200 hover:border-slate-300 focus:border-primary-300 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none bg-white pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">hrs</span>
              </div>
            </div>

            {/* Time tracked per user */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Timer size={11} /> Time Tracked
                </p>
                <div className="flex items-center gap-2">
                  {totalTracked > 0 && (
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                      {formatHours(totalTracked)} total
                    </span>
                  )}
                  <button
                    onClick={() => setShowLogTime(s => !s)}
                    className="text-[10px] font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded-lg transition-colors"
                  >
                    + Log Time
                  </button>
                </div>
              </div>
              {showLogTime && (
                <div className="mb-3 bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Log Time Manually</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Hours *</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.25"
                        value={logHours}
                        onChange={e => setLogHours(e.target.value)}
                        placeholder="e.g. 1.5"
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-primary-300"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Date</label>
                      <input
                        type="date"
                        value={logDate}
                        onChange={e => setLogDate(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-primary-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Description (optional)</label>
                    <input
                      value={logDesc}
                      onChange={e => setLogDesc(e.target.value)}
                      placeholder="What did you work on?"
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-primary-300"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={() => setShowLogTime(false)} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
                    <button
                      onClick={() => { if (logHours && Number(logHours) > 0) addTimeMut.mutate({ hours: Number(logHours), description: logDesc || null, date: logDate }) }}
                      disabled={!logHours || Number(logHours) <= 0 || addTimeMut.isPending}
                      className="btn-primary text-xs px-3 py-1.5 disabled:opacity-40"
                    >
                      {addTimeMut.isPending ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
              {timeByUser.length === 0 ? (
                <div className="text-center py-4 rounded-xl bg-white border border-slate-100">
                  <Clock size={18} className="mx-auto mb-1 text-slate-300" />
                  <p className="text-xs text-slate-400">No time logged yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {timeByUser.map((entry: any) => {
                    const pct = totalTracked > 0 ? Math.min((entry.hours / totalTracked) * 100, 100) : 0
                    const hasActive = !!entry.activeTimer
                    return (
                      <div key={entry.user?.id} className="bg-white rounded-xl border border-slate-100 px-3 py-2.5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <UserAvatar user={entry.user} size="xs" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-slate-700 truncate block">{entry.user?.firstName} {entry.user?.lastName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {hasActive && (
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse inline-block" />
                                Live
                              </span>
                            )}
                            <span className="text-xs font-bold text-slate-900 tabular-nums">
                              {entry.hours > 0 ? formatHours(entry.hours) : hasActive ? '—' : '0m'}
                            </span>
                          </div>
                        </div>
                        {totalTracked > 0 && entry.hours > 0 && (
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-400 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                        {/* Individual entries for current user */}
                        {entry.user?.id === user?.id && (() => {
                          const myEntries = timeEntries.filter((te: any) => te.userId === user?.id)
                          if (myEntries.length === 0) return null
                          return (
                            <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                              {myEntries.map((te: any) => (
                                <div key={te.id} className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                                  <span className="truncate flex-1">{te.description || 'No description'}</span>
                                  <span className="font-mono tabular-nums text-slate-600 flex-shrink-0">{formatHours(te.hours)}</span>
                                  <button
                                    onClick={() => { if (confirm('Remove this time entry?')) deleteTimeMut.mutate(te.id) }}
                                    className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                                    title="Delete entry"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Updates ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
            <h3 className="font-semibold text-slate-900 text-base">Updates</h3>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {comments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <LayoutList size={32} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">No updates yet</p>
                <p className="text-xs mt-1">Be the first to post an update below</p>
              </div>
            )}
            {comments.map((c: any) => {
              const parsed = parseContent(c.content)
              const isOwn = c.user.id === user?.id
              return (
                <div key={c.id} className="flex gap-3">
                  <div className="flex-shrink-0">
                    <UserAvatar user={c.user} size="md" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-800">{c.user.firstName} {c.user.lastName}</span>
                      <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                      {isOwn && (
                        <button
                          onClick={() => { if (confirm('Delete this update?')) deleteCommentMut.mutate(c.id) }}
                          className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors px-1.5 py-0.5 rounded hover:bg-red-50"
                          title="Delete update"
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      )}
                    </div>
                    <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-700">
                      {parsed.text && <p className="whitespace-pre-wrap leading-relaxed">{renderMentions(parsed.text)}</p>}
                      {parsed.images?.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {parsed.images.map((img: string, i: number) => (
                            <img key={i} src={img} alt="" className="max-w-full rounded-xl max-h-72 object-contain border border-slate-100" />
                          ))}
                        </div>
                      )}
                      {parsed.references?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {parsed.references.map((ref: any, i: number) => (
                            <a key={i} href={ref.link}
                              className={clsx('inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg hover:opacity-80 transition-opacity',
                                ref.type === 'ticket' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                ref.type === 'change' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                'bg-slate-100 text-slate-600 border border-slate-200')}>
                              <span className="font-bold">{ref.type === 'ticket' ? 'TKT' : ref.type === 'change' ? 'CR' : 'AST'}</span>
                              {ref.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Attachments</p>
              <div className="space-y-1.5">
                {attachments.map((att: any) => (
                  <div key={att.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 group/att">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500 text-xs font-bold">
                      {att.mimeType?.startsWith('image/') ? '🖼' : att.mimeType?.includes('pdf') ? '📄' : '📎'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <a href={att.url} download={att.name} className="text-xs font-medium text-slate-700 hover:text-primary-600 truncate block">{att.name}</a>
                      <span className="text-[10px] text-slate-400">{att.size > 1024 * 1024 ? `${(att.size / 1024 / 1024).toFixed(1)} MB` : `${(att.size / 1024).toFixed(0)} KB`}</span>
                    </div>
                    <button
                      onClick={() => deleteAttachmentMut.mutate(att.id)}
                      className="opacity-0 group-hover/att:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comment input */}
          <div className="px-6 py-4 border-t border-slate-200 bg-white flex-shrink-0 space-y-3">
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative group/img">
                    <img src={img} alt="" className="h-16 w-16 object-cover rounded-xl border border-slate-200" />
                    <button
                      onClick={() => setImages(imgs => imgs.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 shadow-sm"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* @ mention picker — fixed above textarea */}
            {mention && (() => {
              const mentionMembers = projectMembers.filter((m: any) =>
                `${m.user.firstName} ${m.user.lastName}`.toLowerCase().includes(mention.search.toLowerCase())
              )
              if (mentionMembers.length === 0) return null
              const pickerH = Math.min(mentionMembers.length, 5) * 52 + 12
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
                  {mentionMembers.slice(0, 5).map((m: any) => (
                    <button
                      key={m.user.id}
                      onMouseDown={e => { e.preventDefault(); selectMention(m) }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary-50 transition-colors text-left"
                    >
                      <UserAvatar user={m.user} size="sm" showHoverCard={false} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{m.user.firstName} {m.user.lastName}</p>
                        <p className="text-xs text-slate-400">{m.user.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )
            })()}

            {references.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {references.map((ref, i) => (
                  <span key={i} className={clsx('inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg',
                    ref.type === 'ticket' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    ref.type === 'change' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                    'bg-slate-100 text-slate-600 border border-slate-200')}>
                    <span className="font-bold">{ref.type === 'ticket' ? 'TKT' : ref.type === 'change' ? 'CR' : 'AST'}</span>
                    {ref.label}
                    <button onClick={() => setReferences(refs => refs.filter((_, idx) => idx !== i))} className="hover:opacity-70 ml-0.5">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <UserAvatar user={{ firstName: user?.firstName, lastName: user?.lastName, avatar: user?.avatar }} size="md" />
              </div>
              <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
                <textarea
                  ref={textareaRef}
                  className="w-full bg-transparent px-4 pt-3 pb-2 text-sm resize-none outline-none text-slate-700 placeholder-slate-400"
                  rows={3}
                  placeholder="Write an update… type @ to mention someone"
                  value={text}
                  onChange={handleTextChange}
                  onPaste={handlePaste}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setMention(null); return }
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
                  }}
                />
                <div className="flex items-center justify-between px-3 pb-2.5">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
                    >
                      📎 Attach
                    </button>
                    <input ref={fileRef} type="file" multiple className="hidden" onChange={handleCombinedFileChange} />
                    <button
                      onClick={() => setShowRefPicker(p => !p)}
                      className={clsx('text-xs transition-colors flex items-center gap-1', showRefPicker ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600')}
                    >
                      🔗 Reference
                    </button>
                  </div>
                  <button
                    onClick={submit}
                    disabled={!text.trim() && images.length === 0}
                    className="btn-primary text-sm px-5 py-1.5 disabled:opacity-40 rounded-xl"
                  >
                    Post Update
                  </button>
                </div>
              </div>
            </div>
            {/* Reference picker */}
            {showRefPicker && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden mt-2">
                {/* Tabs */}
                <div className="flex border-b border-slate-100">
                  {(['ticket','change','asset'] as const).map(tab => (
                    <button key={tab} onClick={() => { setRefTab(tab); setRefSearch('') }}
                      className={clsx('flex-1 py-2 text-xs font-semibold capitalize transition-colors',
                        refTab === tab ? 'text-primary-600 border-b-2 border-primary-500' : 'text-slate-400 hover:text-slate-600')}>
                      {tab === 'ticket' ? 'Tickets' : tab === 'change' ? 'Changes' : 'Assets'}
                    </button>
                  ))}
                </div>
                {/* Search */}
                <div className="px-3 py-2 border-b border-slate-100">
                  <input
                    autoFocus
                    value={refSearch}
                    onChange={e => setRefSearch(e.target.value)}
                    placeholder={`Search ${refTab === 'ticket' ? 'tickets' : refTab === 'change' ? 'changes' : 'assets'}…`}
                    className="w-full text-sm outline-none text-slate-700 placeholder-slate-400"
                  />
                </div>
                {/* Results */}
                <div className="max-h-48 overflow-y-auto">
                  {refSearch.length < 2 && (
                    <div className="px-3 py-3 text-xs text-slate-400">Type at least 2 characters to search</div>
                  )}
                  {refSearch.length >= 2 && (() => {
                    const results = refTab === 'ticket' ? ticketResults : refTab === 'change' ? changeResults : assetResults
                    if (results.length === 0) return <div className="px-3 py-3 text-xs text-slate-400">No results</div>
                    return results.slice(0, 8).map((item: any) => {
                      const label = refTab === 'ticket' ? `#${item.number} ${item.title}` : refTab === 'change' ? `CR-${item.number} ${item.title}` : `${item.name}`
                      const link = refTab === 'ticket' ? `/tickets/${ticketRef(item.number)}` : refTab === 'change' ? `/changes/${changeRef(item.number)}` : `/inventory/assets`
                      const alreadyAdded = references.some(r => r.id === item.id)
                      return (
                        <button key={item.id}
                          onClick={() => {
                            if (!alreadyAdded) {
                              setReferences(refs => [...refs, { type: refTab, id: item.id, label, link }])
                            }
                            setShowRefPicker(false)
                            setRefSearch('')
                          }}
                          className={clsx('w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex items-center gap-2',
                            alreadyAdded && 'opacity-50 cursor-default')}
                        >
                          <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded',
                            refTab === 'ticket' ? 'bg-blue-100 text-blue-700' : refTab === 'change' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600')}>
                            {refTab === 'ticket' ? 'TKT' : refTab === 'change' ? 'CR' : 'AST'}
                          </span>
                          <span className="truncate text-slate-700">{label}</span>
                          {alreadyAdded && <span className="ml-auto text-slate-400">Added</span>}
                        </button>
                      )
                    })
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Project settings modal ─────────────────────────────────────────────────────
function ProjectSettingsModal({ project, onClose, onRefresh, onDelete }: {
  project: any; onClose: () => void; onRefresh: () => void; onDelete: () => void
}) {
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description || '')
  const [status, setStatus] = useState(project.status)
  const [startDate, setStartDate] = useState(project.startDate ? format(new Date(project.startDate), 'yyyy-MM-dd') : '')
  const [endDate, setEndDate] = useState(project.endDate ? format(new Date(project.endDate), 'yyyy-MM-dd') : '')
  const [budget, setBudget] = useState(project.budget != null ? String(project.budget) : '')
  const [saved, setSaved] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const saveTemplateMut = useMutation({
    mutationFn: (data: any) => api.post(`/templates/from-project/${project.id}`, data).then(r => r.data),
    onSuccess: () => { setShowSaveTemplate(false); setTemplateName('') },
  })

  const updateMut = useMutation({
    mutationFn: (data: any) => api.patch(`/projects/${project.id}`, data).then(r => r.data),
    onSuccess: () => { onRefresh(); setSaved(true); setTimeout(() => setSaved(false), 2000) },
  })
  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/projects/${project.id}`).then(r => r.data),
    onSuccess: () => onDelete(),
  })

  function save() {
    if (!name.trim()) return
    updateMut.mutate({
      name: name.trim(),
      description: description.trim() || null,
      status,
      startDate: startDate || null,
      endDate: endDate || null,
      budget: budget ? Number(budget) : null,
    })
  }

  const statusCfg = PROJECT_STATUS_CONFIG[status] || PROJECT_STATUS_CONFIG.PLANNING

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-slate-500" />
            <h2 className="font-semibold text-slate-900 text-base">Project Settings</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Name */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Project Name</label>
            <input
              autoFocus
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 font-medium outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Project name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Description</label>
            <textarea
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 resize-none"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this project about?"
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-2">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PROJECT_STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setStatus(key)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all',
                    status === key
                      ? `${cfg.bg} ${cfg.border} ${cfg.color} ring-2 ring-offset-1 ring-current/30`
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  )}
                >
                  <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', status === key ? cfg.dot : 'bg-slate-300')} />
                  <span className="truncate">{cfg.label}</span>
                  {status === key && <Check size={13} className="ml-auto flex-shrink-0" />}
                </button>
              ))}
            </div>
            {/* Quick complete banner */}
            {status !== 'COMPLETED' && (
              <button
                onClick={() => setStatus('COMPLETED')}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 transition-colors text-sm font-medium"
              >
                <CheckCircle2 size={15} /> Mark as Complete
              </button>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                <Calendar size={10} /> Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                <Calendar size={10} /> End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className={clsx(
                  'w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-100',
                  endDate && new Date(endDate) < new Date() && status !== 'COMPLETED' && status !== 'CANCELLED'
                    ? 'border-red-200 text-red-600 focus:border-red-300'
                    : 'border-slate-200 text-slate-700 focus:border-primary-400'
                )}
              />
              {endDate && new Date(endDate) < new Date() && status !== 'COMPLETED' && status !== 'CANCELLED' && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={10} /> Overdue</p>
              )}
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
              <DollarSign size={10} /> Budget
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                placeholder="0.00"
                className="w-full border border-slate-200 rounded-xl pl-7 pr-3 py-2.5 text-sm text-slate-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          {/* Save as Template */}
          <div className="border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-1">Save as Template</p>
            <p className="text-xs text-slate-500 mb-3">Save this project's structure (sections &amp; tasks) as a reusable template.</p>
            {showSaveTemplate ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-400"
                  placeholder="Template name"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowSaveTemplate(false)} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
                  <button
                    onClick={() => saveTemplateMut.mutate({ name: templateName || project.name + ' Template' })}
                    disabled={saveTemplateMut.isPending}
                    className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
                  >
                    {saveTemplateMut.isPending ? 'Saving…' : 'Save Template'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setTemplateName(project.name + ' Template'); setShowSaveTemplate(true) }}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-primary-600 bg-white hover:bg-primary-50 border border-slate-200 hover:border-primary-200 px-3 py-2 rounded-lg transition-colors"
              >
                Save as Template
              </button>
            )}
          </div>

          {/* Danger zone */}
          <div className="border border-red-100 rounded-xl p-4 bg-red-50/40">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-widest mb-1">Danger Zone</p>
            <p className="text-xs text-slate-500 mb-3">Permanently delete this project and all its sections, tasks and time entries. This cannot be undone.</p>
            <button
              onClick={() => {
                if (confirm('Delete this project? This will permanently remove all sections, tasks and time entries.')) {
                  deleteMut.mutate()
                }
              }}
              disabled={deleteMut.isPending}
              className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 bg-white hover:bg-red-50 border border-red-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} /> Delete Project
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            {saved && <span className="text-sm text-green-600 font-medium flex items-center gap-1"><Check size={14} /> Saved</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">Cancel</button>
            <button
              onClick={save}
              disabled={!name.trim() || updateMut.isPending}
              className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
            >
              {updateMut.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Member panel ───────────────────────────────────────────────────────────────
function MemberPanel({ project, onClose, onRefresh }: { project: any; onClose: () => void; onRefresh: () => void }) {
  const [search, setSearch] = useState('')
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users', 'internal'],
    queryFn: () => api.get('/users', { params: { type: 'INTERNAL' } }).then(r => r.data),
  })
  const memberIds = new Set(project.members.map((m: any) => m.user.id))
  const addMut = useMutation({
    mutationFn: (userId: string) => api.post(`/projects/${project.id}/members`, { userId }).then(r => r.data),
    onSuccess: () => onRefresh(),
  })
  const removeMut = useMutation({
    mutationFn: (userId: string) => api.delete(`/projects/${project.id}/members/${userId}`).then(r => r.data),
    onSuccess: () => onRefresh(),
  })

  const filtered = allUsers.filter((u: any) =>
    `${u.firstName} ${u.lastName} ${u.email || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-96 max-h-[70vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Manage Members</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
            <Search size={14} className="text-slate-400 flex-shrink-0" />
            <input
              autoFocus
              placeholder="Search by name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-slate-300 hover:text-slate-500">
                <X size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {filtered.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">No users match "{search}"</div>
          )}
          {filtered.map((u: any) => {
            const isMember = memberIds.has(u.id)
            return (
              <div key={u.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <UserAvatar user={u} size="md" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-slate-400">{u.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => isMember ? removeMut.mutate(u.id) : addMut.mutate(u.id)}
                  className={clsx('text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
                    isMember ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                  )}
                >
                  {isMember ? 'Remove' : 'Add'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const [commentTask, setCommentTask] = useState<any>(null)
  const [showMembers, setShowMembers] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showNewSection, setShowNewSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [newSectionColor, setNewSectionColor] = useState(SECTION_COLORS[0])

  const { data: project, isLoading, refetch } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then(r => r.data),
  })

  // Auto-open task from notification link (?task=UUID)
  useEffect(() => {
    const taskId = searchParams.get('task')
    if (!taskId || !project) return
    for (const section of (project.sections || [])) {
      const task = (section.tasks || []).find((t: any) => t.id === taskId)
      if (task) {
        setCommentTask(task)
        setSearchParams({}, { replace: true })
        break
      }
    }
  }, [project, searchParams, setSearchParams])

  const createSectionMut = useMutation({
    mutationFn: (data: any) => api.post(`/projects/${project?.id}/sections`, data).then(r => r.data),
    onSuccess: () => { refetch(); setShowNewSection(false); setNewSectionName('') },
  })

  const reorderTasksMut = useMutation({
    mutationFn: (orders: any[]) => api.post('/tasks/reorder', { orders }).then(r => r.data),
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    for (const section of (project?.sections || [])) {
      const taskIds = section.tasks.map((t: any) => t.id)
      const oldIndex = taskIds.indexOf(String(active.id))
      const newIndex = taskIds.indexOf(String(over.id))
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(taskIds, oldIndex, newIndex)
        const orders = newOrder.map((taskId: string, idx: number) => ({ id: taskId, order: idx }))
        reorderTasksMut.mutate(orders)
        refetch()
        return
      }
    }
  }

  if (isLoading) return <div className="p-8 text-slate-400">Loading project…</div>
  if (!project) return <div className="p-8 text-red-500">Project not found</div>

  const sections = project.sections || []

  return (
    <div className="flex flex-col h-full -mx-6 -mt-6">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/projects')} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 truncate">{project.name}</h1>
              {(() => {
                const cfg = PROJECT_STATUS_CONFIG[project.status]
                return cfg ? (
                  <span className={clsx('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0', cfg.bg, cfg.color, cfg.border)}>
                    <div className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                    {cfg.label}
                  </span>
                ) : null
              })()}
            </div>
            {project.description && <p className="text-sm text-slate-500 truncate mt-0.5">{project.description}</p>}
          </div>
          <div className="flex -space-x-2 items-center">
            {project.members.slice(0, 5).map((m: any) => (
              <UserAvatar key={m.id} user={m.user} size="sm" />
            ))}
          </div>
          <button
            onClick={() => setShowMembers(true)}
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium bg-primary-50 hover:bg-primary-100 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <UserPlus size={13} /> Members
          </button>
          {project.status !== 'COMPLETED' && project.status !== 'CANCELLED' && (
            <button
              onClick={() => {
                if (confirm('Mark this project as complete?')) {
                  api.patch(`/projects/${project.id}`, { status: 'COMPLETED' }).then(() => refetch())
                }
              }}
              className="flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <CheckCircle2 size={14} /> Complete
            </button>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Settings size={14} /> Settings
          </button>
          <button
            onClick={() => setShowNewSection(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={14} /> New Section
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {sections.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <FolderKanban size={48} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium mb-1">No sections yet</p>
            <p className="text-sm">Create a section to organise your tasks</p>
            <button onClick={() => setShowNewSection(true)} className="btn-primary mt-4 text-sm inline-flex items-center gap-2">
              <Plus size={14} /> Add Section
            </button>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {sections.map((section: any) => (
            <SectionBlock
              key={section.id}
              section={section}
              projectMembers={project.members}
              onOpenComments={setCommentTask}
              onRefresh={refetch}
              projectId={project.id}
            />
          ))}
        </DndContext>
      </div>

      {/* New Section modal */}
      {showNewSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowNewSection(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-80">
            <h3 className="font-semibold text-slate-900 mb-4">New Section</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Section Name</label>
                <input
                  autoFocus
                  className="input"
                  value={newSectionName}
                  onChange={e => setNewSectionName(e.target.value)}
                  placeholder="e.g. To Do, In Progress…"
                  onKeyDown={e => { if (e.key === 'Enter') createSectionMut.mutate({ name: newSectionName || 'New Section', color: newSectionColor }) }}
                />
              </div>
              <div>
                <label className="label">Colour</label>
                <div className="flex gap-2 flex-wrap">
                  {SECTION_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewSectionColor(c)}
                      className={clsx('w-7 h-7 rounded-full transition-transform', newSectionColor === c && 'ring-2 ring-offset-2 ring-slate-400 scale-110')}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowNewSection(false)} className="btn-secondary text-sm">Cancel</button>
                <button
                  onClick={() => createSectionMut.mutate({ name: newSectionName || 'New Section', color: newSectionColor })}
                  className="btn-primary text-sm"
                  disabled={createSectionMut.isPending}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {commentTask && (
        <TaskDetailModal
          task={commentTask}
          projectMembers={project.members}
          onClose={() => setCommentTask(null)}
          onRefresh={refetch}
        />
      )}
      {showMembers && <MemberPanel project={project} onClose={() => setShowMembers(false)} onRefresh={refetch} />}
      {showSettings && (
        <ProjectSettingsModal
          project={project}
          onClose={() => setShowSettings(false)}
          onRefresh={refetch}
          onDelete={() => navigate('/projects')}
        />
      )}
    </div>
  )
}
