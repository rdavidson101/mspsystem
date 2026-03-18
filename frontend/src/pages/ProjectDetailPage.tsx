import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import {
  ArrowLeft, Plus, ChevronDown, ChevronRight, GripVertical,
  Play, Pause, MessageSquare, Trash2, UserPlus, X, Check,
  FolderKanban, Calendar, Clock
} from 'lucide-react'
import clsx from 'clsx'
import { format, formatDistanceToNow } from 'date-fns'
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
  NOT_STARTED:   { label: 'Not Started',   color: 'text-slate-600',  bg: 'bg-slate-100',  dot: 'bg-slate-400'  },
  WORKING_ON_IT: { label: 'Working On It', color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500' },
  STUCK:         { label: 'Stuck',         color: 'text-red-700',    bg: 'bg-red-100',    dot: 'bg-red-500'    },
  DONE:          { label: 'Done',          color: 'text-green-700',  bg: 'bg-green-100',  dot: 'bg-green-500'  },
}
const STATUSES = Object.keys(STATUS_CONFIG)
const SECTION_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6']

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

function Avatar({ name, avatar, size = 6 }: { name: string; avatar?: string; size?: number }) {
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()
  const sz = `w-${size} h-${size}`
  if (avatar) return <img src={avatar} className={clsx(sz, 'rounded-full object-cover flex-shrink-0')} alt={name} />
  return (
    <div className={clsx(sz, 'rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0')}>
      {initials}
    </div>
  )
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
            <span
              className={clsx('text-sm cursor-pointer hover:text-primary-600 block truncate', task.status === 'DONE' && 'line-through text-slate-400')}
              onDoubleClick={() => setEditingTitle(true)}
              title={task.title}
            >
              {task.title}
            </span>
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
                  <div key={a.user.id} title={`${a.user.firstName} ${a.user.lastName}`}>
                    <Avatar name={`${a.user.firstName} ${a.user.lastName}`} avatar={a.user.avatar} size={5} />
                  </div>
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
          <Dropdown trigger={assigneeRef as React.RefObject<HTMLElement>} open={showAssignee} onClose={() => setShowAssignee(false)}>
            <div className="px-2 py-1 text-xs text-slate-400 font-medium border-b border-slate-100">Assignees</div>
            {projectMembers.map((m: any) => {
              const isAssigned = assigneeIds.has(m.user.id)
              return (
                <button
                  key={m.user.id}
                  onClick={() => toggleAssignee(m.user.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  <Avatar name={`${m.user.firstName} ${m.user.lastName}`} size={5} />
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
              task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE'
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
                </div>
              </div>
              {timerError && <span className="text-xs text-red-500 mt-0.5">{timerError}</span>}
            </div>
          ) : (
            <span className="text-xs text-slate-300 px-2">—</span>
          )}
        </div>

        {/* Comments */}
        <div className="w-12 flex-shrink-0 flex justify-center">
          <button
            onClick={() => onOpenComments(task)}
            className="flex items-center gap-0.5 text-slate-400 hover:text-primary-600 transition-colors px-1"
          >
            <MessageSquare size={13} />
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
  const doneCount = tasks.filter((t: any) => t.status === 'DONE').length

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
            <div className="w-12 flex-shrink-0 py-2 text-center">Notes</div>
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

// ── Task comments modal ────────────────────────────────────────────────────────
function TaskCommentsModal({ task, onClose }: { task: any; onClose: () => void }) {
  const { user } = useAuthStore()
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: comments = [], refetch } = useQuery({
    queryKey: ['task-comments', task.id],
    queryFn: () => api.get(`/tasks/${task.id}/comments`).then(r => r.data),
  })
  const addCommentMut = useMutation({
    mutationFn: (content: string) => api.post(`/tasks/${task.id}/comments`, { content }).then(r => r.data),
    onSuccess: () => { refetch(); setText(''); setImages([]) },
  })
  const deleteCommentMut = useMutation({
    mutationFn: (commentId: string) => api.delete(`/tasks/${task.id}/comments/${commentId}`).then(r => r.data),
    onSuccess: () => refetch(),
  })

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files || []).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => setImages(imgs => [...imgs, ev.target?.result as string])
      reader.readAsDataURL(file)
    })
  }

  function submit() {
    if (!text.trim() && images.length === 0) return
    addCommentMut.mutate(JSON.stringify({ text: text.trim(), images }))
  }

  function parseContent(raw: string) {
    try { return JSON.parse(raw) } catch { return { text: raw, images: [] } }
  }

  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.NOT_STARTED

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white h-full w-full max-w-lg shadow-2xl flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-slate-200">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-slate-900 text-base line-clamp-2">{task.title}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={clsx('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', statusCfg.bg, statusCfg.color)}>
                <div className={clsx('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
                {statusCfg.label}
              </span>
              {(task.assignees || []).length > 0 && (
                <div className="flex -space-x-1">
                  {task.assignees.map((a: any) => (
                    <Avatar key={a.user.id} name={`${a.user.firstName} ${a.user.lastName}`} avatar={a.user.avatar} size={5} />
                  ))}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="ml-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {comments.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">No updates yet</div>
          )}
          {comments.map((c: any) => {
            const parsed = parseContent(c.content)
            return (
              <div key={c.id} className="flex gap-3 group/comment">
                <Avatar name={`${c.user.firstName} ${c.user.lastName}`} avatar={c.user.avatar} size={7} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-slate-800">{c.user.firstName} {c.user.lastName}</span>
                    <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
                    {parsed.text && <p className="whitespace-pre-wrap">{parsed.text}</p>}
                    {parsed.images?.map((img: string, i: number) => (
                      <img key={i} src={img} alt="" className="mt-2 max-w-full rounded-lg max-h-64 object-contain" />
                    ))}
                  </div>
                </div>
                {c.user.id === user?.id && (
                  <button
                    onClick={() => deleteCommentMut.mutate(c.id)}
                    className="opacity-0 group-hover/comment:opacity-100 p-1 text-slate-300 hover:text-red-500 flex-shrink-0 self-start"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className="p-4 border-t border-slate-200 space-y-2">
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative group/img">
                  <img src={img} alt="" className="h-16 w-16 object-cover rounded-lg border border-slate-200" />
                  <button
                    onClick={() => setImages(imgs => imgs.filter((_, idx) => idx !== i))}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100"
                  >
                    <X size={9} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <Avatar name={`${user?.firstName} ${user?.lastName}`} size={7} />
            <div className="flex-1">
              <textarea
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-200"
                rows={2}
                placeholder="Write an update… (paste images directly)"
                value={text}
                onChange={e => setText(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between pl-9">
            <button onClick={() => fileRef.current?.click()} className="text-xs text-slate-400 hover:text-slate-600">
              📎 Attach image
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
            <button
              onClick={submit}
              disabled={!text.trim() && images.length === 0}
              className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Member panel ───────────────────────────────────────────────────────────────
function MemberPanel({ project, onClose, onRefresh }: { project: any; onClose: () => void; onRefresh: () => void }) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-80 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Manage Members</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
        <div className="space-y-2">
          {allUsers.map((u: any) => {
            const isMember = memberIds.has(u.id)
            return (
              <div key={u.id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <Avatar name={`${u.firstName} ${u.lastName}`} avatar={u.avatar} size={7} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-slate-400">{u.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => isMember ? removeMut.mutate(u.id) : addMut.mutate(u.id)}
                  className={clsx('text-xs px-2.5 py-1 rounded-lg font-medium transition-colors',
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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const [commentTask, setCommentTask] = useState<any>(null)
  const [showMembers, setShowMembers] = useState(false)
  const [showNewSection, setShowNewSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [newSectionColor, setNewSectionColor] = useState(SECTION_COLORS[0])

  const { data: project, isLoading, refetch } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then(r => r.data),
  })

  const createSectionMut = useMutation({
    mutationFn: (data: any) => api.post(`/projects/${id}/sections`, data).then(r => r.data),
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
            <h1 className="text-xl font-bold text-slate-900 truncate">{project.name}</h1>
            {project.description && <p className="text-sm text-slate-500 truncate">{project.description}</p>}
          </div>
          <div className="flex -space-x-2 items-center">
            {project.members.slice(0, 5).map((m: any) => (
              <div key={m.id} title={`${m.user.firstName} ${m.user.lastName}`} className="ring-2 ring-white rounded-full">
                <Avatar name={`${m.user.firstName} ${m.user.lastName}`} avatar={m.user.avatar} size={7} />
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowMembers(true)}
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-lg transition-colors"
          >
            <UserPlus size={13} /> Members
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

      {commentTask && <TaskCommentsModal task={commentTask} onClose={() => setCommentTask(null)} />}
      {showMembers && <MemberPanel project={project} onClose={() => setShowMembers(false)} onRefresh={refetch} />}
    </div>
  )
}
