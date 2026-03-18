import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ArrowLeft, Plus, Clock, Users, CheckSquare } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import Modal from '@/components/ui/Modal'
import { useAuthStore } from '@/store/authStore'

const statusColors: Record<string, string> = {
  NOT_STARTED: 'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}
const priorityColors: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-red-100 text-red-700',
}

const columns = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']
const columnLabels: Record<string, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [view, setView] = useState<'board' | 'list'>('board')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', assignedToId: '', dueDate: '' })

  const { data: project } = useQuery({ queryKey: ['project', id], queryFn: () => api.get(`/projects/${id}`).then(r => r.data) })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) })

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => api.post('/tasks', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', id] }); setShowModal(false) },
  })
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, ...data }: any) => api.put(`/tasks/${taskId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id] }),
  })

  if (!project) return <div className="p-8 text-center text-slate-400">Loading...</div>

  const totalHours = (project.timeEntries || []).reduce((s: number, e: any) => s + e.hours, 0)
  const completedTasks = (project.tasks || []).filter((t: any) => t.status === 'COMPLETED').length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
          <p className="text-sm text-slate-400">{project.company?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('board')} className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', view === 'board' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 border border-slate-200')}>Board</button>
          <button onClick={() => setView('list')} className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', view === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 border border-slate-200')}>List</button>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={15} /> Add Task
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Total Tasks</p>
          <p className="text-2xl font-bold text-slate-900">{project.tasks?.length || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Time Logged</p>
          <p className="text-2xl font-bold text-primary-600">{totalHours.toFixed(1)}h</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Team Members</p>
          <p className="text-2xl font-bold text-slate-900">{project.members?.length || 0}</p>
        </div>
      </div>

      {/* Board view */}
      {view === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(col => {
            const colTasks = (project.tasks || []).filter((t: any) => t.status === col)
            return (
              <div key={col} className="flex-shrink-0 w-72">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-slate-700 text-sm">{columnLabels[col]}</h3>
                  <span className="badge bg-slate-100 text-slate-600 text-xs">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task: any) => (
                    <div key={task.id} className="card p-3 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-slate-800 flex-1">{task.title}</p>
                        <span className={clsx('badge text-xs flex-shrink-0', priorityColors[task.priority])}>{task.priority}</span>
                      </div>
                      <div className="flex gap-1 mb-2">
                        {(task.tags || []).map((tag: string) => (
                          <span key={tag} className="badge bg-blue-50 text-blue-600 text-xs">{tag}</span>
                        ))}
                      </div>
                      {task.dueDate && (
                        <p className="text-xs text-slate-400 mb-2">{format(new Date(task.dueDate), 'MMM d, yyyy')}</p>
                      )}
                      <div className="flex items-center justify-between">
                        {task.assignedTo && (
                          <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center">
                            <span className="text-white text-xs">{task.assignedTo.firstName[0]}</span>
                          </div>
                        )}
                        <select
                          value={task.status}
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateTaskMutation.mutate({ taskId: task.id, status: e.target.value })}
                          className="text-xs border border-slate-200 rounded px-1.5 py-1 ml-auto"
                        >
                          <option value="NOT_STARTED">Not Started</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Task</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Priority</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Assigned</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Due Date</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {(project.tasks || []).map((task: any) => (
                <tr key={task.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-4">
                    <p className="text-sm font-medium text-slate-800">{task.title}</p>
                    <p className="text-xs text-slate-400">{task.description}</p>
                  </td>
                  <td className="py-3 px-4"><span className={clsx('badge text-xs', priorityColors[task.priority])}>{task.priority}</span></td>
                  <td className="py-3 px-4 text-sm text-slate-600">{task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : '—'}</td>
                  <td className="py-3 px-4 text-xs text-slate-500">{task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '—'}</td>
                  <td className="py-3 px-4">
                    <select
                      value={task.status}
                      onChange={e => updateTaskMutation.mutate({ taskId: task.id, status: e.target.value })}
                      className="text-xs border border-slate-200 rounded px-2 py-1"
                    >
                      <option value="NOT_STARTED">Not Started</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Task">
        <form onSubmit={e => { e.preventDefault(); createTaskMutation.mutate({ ...form, projectId: id, assignedToId: form.assignedToId || undefined, dueDate: form.dueDate || undefined }) }} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input h-20 resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <label className="label">Assign To</label>
              <select className="input" value={form.assignedToId} onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}>
                <option value="">Unassigned</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Due Date</label>
            <input type="date" className="input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
