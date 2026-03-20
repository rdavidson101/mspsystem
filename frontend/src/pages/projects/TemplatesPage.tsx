import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { projectRef } from '@/lib/refs'
import { useNavigate } from 'react-router-dom'
import { LayoutTemplate, Trash2, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import Modal from '@/components/ui/Modal'

const PAGE_SIZE = 10

export default function TemplatesPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [useTemplateId, setUseTemplateId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', status: 'PLANNING', companyId: '', startDate: '', endDate: '', budget: '' })

  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then(r => r.data),
  })
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete('/templates/' + id).then(r => r.data),
    onSuccess: () => refetch(),
  })
  const createMut = useMutation({
    mutationFn: (data: any) => api.post('/projects', data).then(r => r.data),
    onSuccess: (proj) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setUseTemplateId(null)
      navigate('/projects/' + projectRef(proj.number))
    },
  })

  function handleCreateFromTemplate(e: React.FormEvent) {
    e.preventDefault()
    createMut.mutate({
      ...form,
      budget: form.budget ? Number(form.budget) : undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      companyId: form.companyId || undefined,
      templateId: useTemplateId || undefined,
    })
  }

  const filtered = templates.filter((t: any) => !search || t.name.toLowerCase().includes(search.toLowerCase()))
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const selectedTemplate = templates.find((t: any) => t.id === useTemplateId)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Templates</h1>
          <p className="text-sm text-slate-500">{filtered.length} template{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading…</div>
      ) : templates.length === 0 ? (
        <div className="card p-16 text-center text-slate-400">
          <LayoutTemplate size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No templates yet</p>
          <p className="text-sm mt-1">Open a project → Settings → Save as Template to create one</p>
        </div>
      ) : (
        <>
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search…" className="input pl-9 text-sm w-full" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-[2fr_80px_80px_1fr_100px_120px] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              <div>Template</div>
              <div>Sections</div>
              <div>Tasks</div>
              <div>Created By</div>
              <div>Date</div>
              <div></div>
            </div>
            {paged.map((template: any) => {
              const sectionCount = template.sections?.length ?? 0
              const taskCount = (template.sections ?? []).reduce((s: number, sec: any) => s + (sec.tasks?.length ?? 0), 0)
              const createdBy = template.createdBy ? `${template.createdBy.firstName} ${template.createdBy.lastName}` : '—'
              const createdAt = template.createdAt ? format(new Date(template.createdAt), 'dd MMM yyyy') : '—'
              return (
                <div key={template.id} className="grid grid-cols-[2fr_80px_80px_1fr_100px_120px] gap-4 px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <LayoutTemplate size={14} className="text-violet-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{template.name}</p>
                        {template.description && <p className="text-xs text-slate-400 truncate">{template.description}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-slate-600">{sectionCount}</div>
                  <div className="text-sm font-medium text-slate-600">{taskCount}</div>
                  <div className="text-xs text-slate-600 truncate">{createdBy}</div>
                  <div className="text-xs text-slate-400">{createdAt}</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUseTemplateId(template.id)}
                      className="btn-primary text-xs px-3 py-1.5"
                    >
                      Use
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this template?')) deleteMut.mutate(template.id) }}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, templates.length)} of {templates.length}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft size={16} /></button>
                <span className="text-sm font-medium text-slate-700">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Use Template → New Project Modal */}
      <Modal open={!!useTemplateId} onClose={() => setUseTemplateId(null)} title={`New Project from "${selectedTemplate?.name ?? 'Template'}"`}>
        <form onSubmit={handleCreateFromTemplate} className="space-y-4">
          {selectedTemplate && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-xs text-violet-700">
              <span className="font-semibold">{selectedTemplate.sections?.length ?? 0} sections</span> and{' '}
              <span className="font-semibold">{(selectedTemplate.sections ?? []).reduce((s: number, sec: any) => s + (sec.tasks?.length ?? 0), 0)} tasks</span> will be created from this template.
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
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setUseTemplateId(null)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMut.isPending}>{createMut.isPending ? 'Creating…' : 'Create Project'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
