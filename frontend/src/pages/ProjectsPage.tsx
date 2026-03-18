import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Link } from 'react-router-dom'
import { Plus, FolderKanban, Calendar, Users } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import Modal from '@/components/ui/Modal'

const statusColors: Record<string, string> = {
  PLANNING: 'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  ON_HOLD: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function ProjectsPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', status: 'PLANNING', companyId: '', startDate: '', endDate: '', budget: '' })

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects').then(r => r.data) })
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/projects', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setShowModal(false) },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500">{projects.length} total projects</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((project: any) => (
          <Link key={project.id} to={`/projects/${project.id}`} className="card p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <FolderKanban size={20} className="text-primary-600" />
              </div>
              <span className={clsx('badge text-xs', statusColors[project.status])}>{project.status.replace(/_/g, ' ')}</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-primary-600 transition-colors">{project.name}</h3>
            <p className="text-xs text-slate-500 mb-4 line-clamp-2">{project.description || 'No description'}</p>
            <div className="space-y-2">
              {project.company && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                  {project.company.name}
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-slate-400">
                {project.startDate && (
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {format(new Date(project.startDate), 'MMM d')} – {project.endDate ? format(new Date(project.endDate), 'MMM d') : '?'}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users size={11} />
                  {project.members?.length || 0} members
                </span>
                <span>{project._count?.tasks || 0} tasks</span>
              </div>
              {project.budget && (
                <div className="text-xs font-medium text-slate-600">${project.budget.toLocaleString()} budget</div>
              )}
            </div>
          </Link>
        ))}
        {projects.length === 0 && (
          <div className="col-span-3 card p-12 text-center text-slate-400">
            <FolderKanban size={40} className="mx-auto mb-2 opacity-30" />
            No projects yet
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Project">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ ...form, budget: form.budget ? Number(form.budget) : undefined, startDate: form.startDate || undefined, endDate: form.endDate || undefined, companyId: form.companyId || undefined }) }} className="space-y-4">
          <div>
            <label className="label">Project Name</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input h-20 resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="PLANNING">Planning</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ON_HOLD">On Hold</option>
              </select>
            </div>
            <div>
              <label className="label">Company</label>
              <select className="input" value={form.companyId} onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))}>
                <option value="">None</option>
                {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Budget ($)</label>
            <input type="number" className="input" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
