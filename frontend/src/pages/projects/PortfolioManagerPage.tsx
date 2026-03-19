import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Link } from 'react-router-dom'
import { Plus, FolderKanban, ChevronLeft, ChevronRight, ChevronDown, MessageSquare, Clock, X, Trash2, Check } from 'lucide-react'
import clsx from 'clsx'
import { format, formatDistanceToNow } from 'date-fns'
import { useAuthStore } from '@/store/authStore'
import Modal from '@/components/ui/Modal'
import UserAvatar from '@/components/ui/UserAvatar'

const PROJECT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  PLANNING:    { label: 'Planning',    color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-200', dot: 'bg-indigo-500'  },
  IN_PROGRESS: { label: 'In Progress', color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200', dot: 'bg-orange-500'  },
  ON_HOLD:     { label: 'On Hold',     color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200', dot: 'bg-yellow-500'  },
  COMPLETED:   { label: 'Completed',   color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200',  dot: 'bg-green-500'   },
  CANCELLED:   { label: 'Cancelled',   color: 'text-slate-600',  bg: 'bg-slate-100',  border: 'border-slate-200',  dot: 'bg-slate-400'   },
}
const PAGE_SIZE = 10

function formatHours(h: number) {
  if (!h) return '—'
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`
  if (hrs > 0) return `${hrs}h`
  return `${mins}m`
}

function ProjectUpdatesModal({ project, onClose }: { project: any; onClose: () => void }) {
  const { user } = useAuthStore()
  const [text, setText] = useState('')

  const { data: comments = [], refetch } = useQuery({
    queryKey: ['project-comments', project.id],
    queryFn: () => api.get(`/projects/${project.id}/comments`).then(r => r.data),
  })
  const addMut = useMutation({
    mutationFn: (content: string) => api.post(`/projects/${project.id}/comments`, { content }).then(r => r.data),
    onSuccess: () => { refetch(); setText('') },
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${project.id}/comments/${id}`).then(r => r.data),
    onSuccess: () => refetch(),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" style={{ maxHeight: '80vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-primary-500" />
              <h2 className="font-semibold text-slate-900 text-base">Project Updates</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{project.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Comments feed */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {comments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <MessageSquare size={32} className="mb-3 opacity-20" />
              <p className="text-sm font-medium">No updates yet</p>
              <p className="text-xs mt-1">Be the first to post an update below</p>
            </div>
          )}
          {comments.map((c: any) => {
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
                        onClick={() => { if (confirm('Delete this update?')) deleteMut.mutate(c.id) }}
                        className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors px-1.5 py-0.5 rounded hover:bg-red-50"
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    )}
                  </div>
                  <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {c.content}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <UserAvatar user={{ firstName: user?.firstName, lastName: user?.lastName, avatar: user?.avatar }} size="md" />
            </div>
            <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
              <textarea
                autoFocus
                rows={3}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Write a project update…"
                className="w-full bg-transparent px-4 pt-3 pb-2 text-sm resize-none outline-none text-slate-700 placeholder-slate-400"
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim()) addMut.mutate(text.trim()) }}
              />
              <div className="flex justify-end px-3 pb-2.5">
                <button
                  onClick={() => { if (text.trim()) addMut.mutate(text.trim()) }}
                  disabled={!text.trim() || addMut.isPending}
                  className="btn-primary text-sm px-5 py-1.5 disabled:opacity-40 rounded-xl"
                >
                  Post Update
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function StatusDropdown({ project, onUpdate }: { project: any; onUpdate: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const cfg = PROJECT_STATUS_CONFIG[project.status] || PROJECT_STATUS_CONFIG.PLANNING

  const updateMut = useMutation({
    mutationFn: (status: string) => api.patch(`/projects/${project.id}`, { status }).then(r => r.data),
    onSuccess: () => { onUpdate(); setOpen(false) },
  })

  return (
    <div className="relative">
      <button
        ref={ref}
        onClick={e => { e.preventDefault(); setOpen(o => !o) }}
        className={clsx('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity', cfg.bg, cfg.color)}
      >
        <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
        {cfg.label}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 min-w-[160px]">
          {Object.entries(PROJECT_STATUS_CONFIG).map(([key, c]) => (
            <button
              key={key}
              onClick={e => { e.preventDefault(); updateMut.mutate(key) }}
              className={clsx('w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50', c.color)}
            >
              <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', c.dot)} />
              <span className="flex-1 text-left font-medium">{c.label}</span>
              {project.status === key && <Check size={12} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PortfolioManagerPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [updatesProject, setUpdatesProject] = useState<any | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', status: 'PLANNING', companyId: '', startDate: '', endDate: '', budget: '' })

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', 'portfolio'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  })
  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (data: any) => api.post('/projects', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setShowModal(false); resetForm() },
  })

  function resetForm() {
    setForm({ name: '', description: '', status: 'PLANNING', companyId: '', startDate: '', endDate: '', budget: '' })
    setSelectedTemplateId(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createMut.mutate({
      ...form,
      budget: form.budget ? Number(form.budget) : undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      companyId: form.companyId || undefined,
      templateId: selectedTemplateId || undefined,
    })
  }

  const totalPages = Math.max(1, Math.ceil(projects.length / PAGE_SIZE))
  const paged = projects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Portfolio Manager</h1>
          <p className="text-sm text-slate-500">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Project
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="card p-16 text-center text-slate-400">
          <FolderKanban size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No projects yet</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_120px_100px_100px_60px] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              <div>Project</div>
              <div>Customer</div>
              <div>Status</div>
              <div>Team</div>
              <div>Tasks</div>
              <div>Time</div>
              <div>Updates</div>
            </div>
            {paged.map((project: any) => {
              const endOverdue = project.endDate && new Date(project.endDate) < new Date() && !['COMPLETED','CANCELLED'].includes(project.status)
              return (
                <div key={project.id} className="border-b border-slate-100 last:border-0">
                  <div className="grid grid-cols-[2fr_1fr_1fr_120px_100px_100px_60px] gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors items-center">
                    <div className="min-w-0">
                      <Link to={`/projects/${project.id}`} className="text-sm font-semibold text-slate-900 hover:text-primary-600 transition-colors truncate block">{project.name}</Link>
                      {project.description && <p className="text-xs text-slate-400 truncate mt-0.5">{project.description}</p>}
                      {project.endDate && (
                        <p className={clsx('text-[10px] mt-0.5', endOverdue ? 'text-red-500 font-medium' : 'text-slate-400')}>
                          {endOverdue ? '⚠ Overdue · ' : ''}Due {format(new Date(project.endDate), 'dd MMM yyyy')}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 truncate">
                      {project.company ? project.company.name : <span className="text-slate-300">—</span>}
                    </div>
                    <div onClick={e => e.preventDefault()}>
                      <StatusDropdown project={project} onUpdate={() => qc.invalidateQueries({ queryKey: ['projects', 'portfolio'] })} />
                    </div>
                    <div>
                      <div className="flex -space-x-1.5">
                        {(project.members || []).slice(0, 4).map((m: any) => (
                          <UserAvatar key={m.id} user={m.user} size="xs" />
                        ))}
                        {(project.members?.length || 0) > 4 && (
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">+{project.members.length - 4}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-slate-600">{project._count?.tasks ?? 0}</div>
                    <div className="text-xs font-medium text-slate-600 flex items-center gap-1">
                      <Clock size={11} className="text-slate-400" />
                      {formatHours(project.totalHours || 0)}
                    </div>
                    <div>
                      <button
                        onClick={() => setUpdatesProject(project)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        title="View updates"
                      >
                        <MessageSquare size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, projects.length)} of {projects.length}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft size={16} /></button>
                <span className="text-sm font-medium text-slate-700">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Project Updates Modal */}
      {updatesProject && (
        <ProjectUpdatesModal project={updatesProject} onClose={() => setUpdatesProject(null)} />
      )}

      {/* New Project Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm() }} title="New Project">
        <form onSubmit={handleSubmit} className="space-y-4">
          {templates.length > 0 && (
            <div>
              <label className="label">Start from template (optional)</label>
              <div className="flex flex-wrap gap-2">
                {templates.map((t: any) => (
                  <button key={t.id} type="button" onClick={() => setSelectedTemplateId(selectedTemplateId === t.id ? null : t.id)}
                    className={clsx('text-sm px-3 py-1.5 rounded-lg border transition-colors',
                      selectedTemplateId === t.id ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')}>
                    {t.name}
                  </button>
                ))}
              </div>
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
            <label className="label">Budget (£)</label>
            <input type="number" className="input" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMut.isPending}>{createMut.isPending ? 'Creating…' : 'Create Project'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
