import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, CheckSquare } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import Modal from '@/components/ui/Modal'

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

export default function TasksPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', assignedToId: '', projectId: '', dueDate: '' })

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', statusFilter],
    queryFn: () => api.get('/tasks', { params: { status: statusFilter || undefined } }).then(r => r.data),
  })
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects').then(r => r.data) })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/tasks', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowModal(false) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/tasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500">{tasks.length} total tasks</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Task
        </button>
      </div>

      <div className="flex gap-2">
        {['', 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50')}
          >
            {s === '' ? 'All' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">#</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Title</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Project</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Priority</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Assigned To</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Due Date</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task: any, i: number) => (
              <tr key={task.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-xs font-mono text-slate-400">{String(task.number || i+1).padStart(2,'0')}</td>
                <td className="py-3 px-4">
                  <p className="text-sm font-medium text-slate-800">{task.title}</p>
                  <div className="flex gap-1 mt-1">{(task.tags||[]).slice(0,2).map((t:string)=><span key={t} className="badge bg-blue-50 text-blue-600 text-xs">{t}</span>)}</div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-500">{task.project?.name || '—'}</td>
                <td className="py-3 px-4"><span className={clsx('badge text-xs', priorityColors[task.priority])}>{task.priority}</span></td>
                <td className="py-3 px-4 text-sm text-slate-600">{task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : '—'}</td>
                <td className="py-3 px-4 text-xs text-slate-500">{task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '—'}</td>
                <td className="py-3 px-4">
                  <select
                    value={task.status}
                    onChange={e => updateMutation.mutate({ id: task.id, status: e.target.value })}
                    className={clsx('badge text-xs cursor-pointer border-0 appearance-none font-medium', statusColors[task.status])}
                  >
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-slate-400"><CheckSquare size={32} className="mx-auto mb-2 opacity-30" />No tasks found</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Task">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ ...form, assignedToId: form.assignedToId || undefined, projectId: form.projectId || undefined, dueDate: form.dueDate || undefined }) }} className="space-y-4">
          <div><label className="label">Title</label><input className="input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required /></div>
          <div><label className="label">Description</label><textarea className="input h-20 resize-none" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Priority</label><select className="input" value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></div>
            <div><label className="label">Project</label><select className="input" value={form.projectId} onChange={e => setForm(f => ({...f, projectId: e.target.value}))}><option value="">None</option>{projects.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Assign To</label><select className="input" value={form.assignedToId} onChange={e => setForm(f => ({...f, assignedToId: e.target.value}))}><option value="">Unassigned</option>{users.map((u:any)=><option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}</select></div>
            <div><label className="label">Due Date</label><input type="date" className="input" value={form.dueDate} onChange={e => setForm(f => ({...f, dueDate: e.target.value}))} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Task'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
