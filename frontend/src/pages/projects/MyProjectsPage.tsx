import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCurrency } from '@/lib/useCurrency'
import { projectRef } from '@/lib/refs'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, FolderKanban, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import Modal from '@/components/ui/Modal'
import UserAvatar from '@/components/ui/UserAvatar'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

const PROJECT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  PLANNING:    { label: 'Planning',    color: 'text-indigo-700', bg: 'bg-indigo-50',  dot: 'bg-indigo-500'  },
  IN_PROGRESS: { label: 'In Progress', color: 'text-orange-700', bg: 'bg-orange-50',  dot: 'bg-orange-500'  },
  ON_HOLD:     { label: 'On Hold',     color: 'text-yellow-700', bg: 'bg-yellow-50',  dot: 'bg-yellow-500'  },
  COMPLETED:   { label: 'Completed',   color: 'text-green-700',  bg: 'bg-green-50',   dot: 'bg-green-500'   },
  CANCELLED:   { label: 'Cancelled',   color: 'text-slate-600',  bg: 'bg-slate-100',  dot: 'bg-slate-400'   },
}

const PAGE_SIZE = 10

export default function MyProjectsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { symbol } = useCurrency()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', status: 'PLANNING', companyId: '', startDate: '', endDate: '', budget: '' })

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', 'mine'],
    queryFn: () => api.get('/projects', { params: { mine: 'true' } }).then(r => r.data),
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
    onSuccess: (proj) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setShowModal(false)
      resetForm()
      navigate('/projects/' + projectRef(proj.number))
    },
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

  const filtered = projects.filter((p: any) =>
    (!search || p.name.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || p.status === statusFilter)
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Projects</h1>
          <p className="text-sm text-slate-500">{projects.length} project{projects.length !== 1 ? 's' : ''} assigned to you</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search…" className="input pl-9 text-sm w-full" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="input text-sm w-auto">
          <option value="">All Statuses</option>
          <option value="PLANNING">Planning</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center text-slate-400">
          <FolderKanban size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">{projects.length === 0 ? 'No projects assigned to you' : 'No projects match your filters'}</p>
          {projects.length === 0 && (
            <>
              <p className="text-sm mt-1">Create a project or ask to be added to one</p>
              <button onClick={() => setShowModal(true)} className="btn-primary mt-4 text-sm inline-flex items-center gap-2">
                <Plus size={14} /> New Project
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_120px_180px_100px] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              <div>Project</div>
              <div>Customer</div>
              <div>Status</div>
              <div>Team</div>
              <div>Dates</div>
              <div>Tasks</div>
            </div>
            {paged.map((project: any) => {
              const cfg = PROJECT_STATUS_CONFIG[project.status] || PROJECT_STATUS_CONFIG.PLANNING
              const endOverdue = project.endDate && new Date(project.endDate) < new Date() && !['COMPLETED','CANCELLED'].includes(project.status)
              return (
                <Link
                  key={project.id}
                  to={`/projects/${projectRef(project.number)}`}
                  className="grid grid-cols-[2fr_1fr_1fr_120px_180px_100px] gap-4 px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-primary-50/40 transition-colors items-center"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{project.name}</p>
                    {project.description && <p className="text-xs text-slate-400 truncate mt-0.5">{project.description}</p>}
                  </div>
                  <div className="min-w-0">
                    {project.company ? (
                      <span className="text-xs text-slate-600 truncate block">{project.company.name}</span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>
                  <div>
                    <span className={clsx('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full', cfg.bg, cfg.color)}>
                      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
                      {cfg.label}
                    </span>
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
                  <div className="text-xs text-slate-500 space-y-0.5">
                    {project.startDate && <div>Start: {format(new Date(project.startDate), 'dd MMM yyyy')}</div>}
                    {project.endDate && (
                      <div className={endOverdue ? 'text-red-500 font-medium' : ''}>
                        End: {format(new Date(project.endDate), 'dd MMM yyyy')}{endOverdue ? ' · Overdue' : ''}
                      </div>
                    )}
                    {!project.startDate && !project.endDate && <span className="text-slate-300">No dates set</span>}
                  </div>
                  <div className="text-sm font-medium text-slate-600">{project._count?.tasks ?? 0}</div>
                </Link>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-medium text-slate-700">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
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
            <label className="label">Budget ({symbol})</label>
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
