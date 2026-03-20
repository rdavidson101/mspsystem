import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { projectRef } from '@/lib/refs'
import { Link } from 'react-router-dom'
import { Plus, FolderKanban, Users, Calendar, CheckSquare, Trash2, LayoutTemplate } from 'lucide-react'
import clsx from 'clsx'
import Modal from '@/components/ui/Modal'
import { useAuthStore } from '@/store/authStore'
import { format } from 'date-fns'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

const statusConfig: Record<string, { label: string; color: string }> = {
  PLANNING: { label: 'Planning', color: 'bg-slate-100 text-slate-600' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  ON_HOLD: { label: 'On Hold', color: 'bg-yellow-100 text-yellow-700' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
}

function Avatar({ name, avatar, size = 6 }: { name: string; avatar?: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  if (avatar) return <img src={avatar} className={`w-${size} h-${size} rounded-full object-cover`} alt={name} />
  return (
    <div className={`w-${size} h-${size} rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold`}>
      {initials}
    </div>
  )
}

export default function ProjectsPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [view, setView] = useState<'projects' | 'templates'>('projects')
  const [showModal, setShowModal] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', description: '', status: 'PLANNING', companyId: '',
    startDate: '', endDate: '', budget: '',
  })

  const { data: projects = [], isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  })
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users', 'internal'],
    queryFn: () => api.get('/users', { params: { type: 'INTERNAL' } }).then(r => r.data),
  })
  const { data: templates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/projects', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      refetch()
      setShowModal(false)
      resetForm()
    },
  })

  const deleteTemplateMut = useMutation({
    mutationFn: (id: string) => api.delete('/templates/' + id).then(r => r.data),
    onSuccess: () => refetchTemplates(),
  })

  function resetForm() {
    setForm({ name: '', description: '', status: 'PLANNING', companyId: '', startDate: '', endDate: '', budget: '' })
    setSelectedTemplateId(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      budget: form.budget ? Number(form.budget) : undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      companyId: form.companyId || undefined,
      templateId: selectedTemplateId || undefined,
    })
  }

  function openModalWithTemplate(templateId: string) {
    setSelectedTemplateId(templateId)
    setShowModal(true)
  }

  const active = projects.filter((p: any) => !['COMPLETED', 'CANCELLED'].includes(p.status))
  const archived = projects.filter((p: any) => ['COMPLETED', 'CANCELLED'].includes(p.status))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500">
            {view === 'projects'
              ? `${projects.length} project${projects.length !== 1 ? 's' : ''}`
              : `${templates.length} template${templates.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab switcher */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setView('projects')}
              className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors', view === 'projects' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              Projects
            </button>
            <button
              onClick={() => setView('templates')}
              className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors', view === 'templates' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              Templates
            </button>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      {/* Projects view */}
      {view === 'projects' && (
        <>
          {isLoading && <div className="text-slate-400 text-sm">Loading…</div>}

          {/* Active projects */}
          {active.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {active.map((project: any) => <ProjectCard key={project.id} project={project} />)}
            </div>
          )}

          {/* Archived */}
          {archived.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Completed / Cancelled</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-60">
                {archived.map((project: any) => <ProjectCard key={project.id} project={project} />)}
              </div>
            </div>
          )}

          {!isLoading && projects.length === 0 && (
            <div className="card p-16 text-center text-slate-400">
              <FolderKanban size={48} className="mx-auto mb-3 opacity-20" />
              <p className="font-medium">No projects yet</p>
              <p className="text-sm mt-1">Create your first project to get started</p>
              <button onClick={() => setShowModal(true)} className="btn-primary mt-4 text-sm inline-flex items-center gap-2">
                <Plus size={14} /> New Project
              </button>
            </div>
          )}
        </>
      )}

      {/* Templates view */}
      {view === 'templates' && (
        <>
          {templates.length === 0 ? (
            <div className="card p-16 text-center text-slate-400">
              <LayoutTemplate size={48} className="mx-auto mb-3 opacity-20" />
              <p className="font-medium">No templates yet</p>
              <p className="text-sm mt-1">Save a project as a template to reuse its structure</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {templates.map((template: any) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={() => openModalWithTemplate(template.id)}
                  onDelete={() => {
                    if (confirm('Delete this template?')) deleteTemplateMut.mutate(template.id)
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* New Project Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm() }} title="New Project">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template selector */}
          {templates.length > 0 && (
            <div>
              <label className="label">Start from template (optional)</label>
              <div className="flex flex-wrap gap-2">
                {templates.map((t: any) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(selectedTemplateId === t.id ? null : t.id)}
                    className={clsx('text-sm px-3 py-1.5 rounded-lg border transition-colors',
                      selectedTemplateId === t.id
                        ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              {selectedTemplateId && (() => {
                const t = templates.find((t: any) => t.id === selectedTemplateId)
                if (!t) return null
                return (
                  <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                    {t.sections?.length ?? 0} sections, {(t.sections ?? []).reduce((sum: number, s: any) => sum + (s.tasks?.length ?? 0), 0)} tasks will be created
                  </div>
                )
              })()}
            </div>
          )}

          <div>
            <label className="label">Project Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Website Redesign" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none h-20" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this project about?" />
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
              <SearchableSelect
                value={form.companyId}
                onChange={val => setForm(f => ({ ...f, companyId: val }))}
                options={companies.map((c: any) => ({ value: c.id, label: c.name }))}
                placeholder="None"
                emptyLabel="None"
              />
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
            <label className="label">Budget (£)</label>
            <input type="number" className="input" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function ProjectCard({ project }: { project: any }) {
  const cfg = statusConfig[project.status] || statusConfig.PLANNING
  const taskCount = project._count?.tasks || 0
  const sectionCount = project._count?.sections || 0

  return (
    <Link to={`/projects/${projectRef(project.number)}`} className="card p-5 hover:shadow-md transition-all group border border-transparent hover:border-primary-200">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <FolderKanban size={20} className="text-white" />
        </div>
        <span className={clsx('badge text-xs', cfg.color)}>{cfg.label}</span>
      </div>

      <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-primary-600 transition-colors line-clamp-1">{project.name}</h3>
      <p className="text-xs text-slate-400 mb-4 line-clamp-2 min-h-[2rem]">{project.description || 'No description'}</p>

      {project.company && (
        <div className="flex items-center gap-1.5 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
          <span className="text-xs text-slate-500">{project.company.name}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        {/* Member avatars */}
        <div className="flex -space-x-1.5">
          {(project.members || []).slice(0, 4).map((m: any) => (
            <div key={m.id} title={`${m.user.firstName} ${m.user.lastName}`}>
              <Avatar name={`${m.user.firstName} ${m.user.lastName}`} avatar={m.user.avatar} size={7} />
            </div>
          ))}
          {(project.members?.length || 0) > 4 && (
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-medium">
              +{project.members.length - 4}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><CheckSquare size={11} /> {taskCount}</span>
          {project.budget && <span className="font-medium text-slate-600">£{Number(project.budget).toLocaleString()}</span>}
        </div>
      </div>
    </Link>
  )
}

function TemplateCard({ template, onUse, onDelete }: { template: any; onUse: () => void; onDelete: () => void }) {
  const sectionCount = template.sections?.length ?? 0
  const taskCount = (template.sections ?? []).reduce((sum: number, s: any) => sum + (s.tasks?.length ?? 0), 0)
  const createdAt = template.createdAt ? format(new Date(template.createdAt), 'MMM d, yyyy') : ''
  const createdBy = template.createdBy
    ? `${template.createdBy.firstName} ${template.createdBy.lastName}`
    : ''

  return (
    <div className="card p-5 hover:shadow-md transition-all border border-transparent hover:border-primary-200 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-100">
          <LayoutTemplate size={20} className="text-violet-600" />
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete template"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1">{template.name}</h3>
      {template.description && (
        <p className="text-xs text-slate-400 mb-2 line-clamp-2">{template.description}</p>
      )}
      <p className="text-xs text-slate-400 mb-4">
        {sectionCount} section{sectionCount !== 1 ? 's' : ''} &bull; {taskCount} task{taskCount !== 1 ? 's' : ''}
      </p>

      <div className="mt-auto flex items-center justify-between">
        <div className="text-xs text-slate-400">
          {createdBy && <span>{createdBy}</span>}
          {createdAt && <span className="ml-1">· {createdAt}</span>}
        </div>
        <button
          onClick={onUse}
          className="btn-primary text-xs px-3 py-1.5"
        >
          Use Template
        </button>
      </div>
    </div>
  )
}
