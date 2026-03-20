import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, Edit2, Trash2, Factory } from 'lucide-react'
import Modal from '@/components/ui/Modal'

const PAGE_SIZE = 10

const emptyForm = { name: '', website: '', phone: '', email: '', notes: '', isActive: true }

export default function ManufacturersPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>(emptyForm)
  const [page, setPage] = useState(0)

  const { data: manufacturers = [] } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: () => api.get('/inventory/manufacturers').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editing
        ? api.patch(`/inventory/manufacturers/${editing.id}`, data)
        : api.post('/inventory/manufacturers', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['manufacturers'] }); closeModal() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/manufacturers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['manufacturers'] }),
  })

  function openAdd() { setEditing(null); setForm({ ...emptyForm }); setShowModal(true) }
  function openEdit(m: any) {
    setEditing(m)
    setForm({
      name: m.name || '',
      website: m.website || '',
      phone: m.phone || '',
      email: m.email || '',
      notes: m.notes || '',
      isActive: m.isActive ?? true,
    })
    setShowModal(true)
  }
  function closeModal() { setShowModal(false); setEditing(null) }

  const totalPages = Math.ceil(manufacturers.length / PAGE_SIZE)
  const pagedManufacturers = manufacturers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manufacturers</h1>
          <p className="text-sm text-slate-500 mt-0.5">{manufacturers.length} manufacturer{manufacturers.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Manufacturer
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Website</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Assets</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {manufacturers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-sm text-slate-400">No manufacturers yet</td>
              </tr>
            )}
            {pagedManufacturers.map((m: any) => (
              <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Factory size={13} className="text-slate-500" />
                    </div>
                    <div>
                      <span className="font-medium text-slate-900 text-sm">{m.name}</span>
                      {!m.isActive && (
                        <span className="ml-2 badge text-xs bg-slate-100 text-slate-600">Inactive</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-500">
                  {m.website ? (
                    <a href={m.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline truncate max-w-[160px] block">
                      {m.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : '—'}
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{m.phone || '—'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{m.email || '—'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{m._count?.assets ?? 0}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(m)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                    <button
                      onClick={() => { if (confirm('Delete this manufacturer?')) deleteMutation.mutate(m.id) }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, manufacturers.length)} of {manufacturers.length}
            </span>
            <div className="flex gap-1">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Previous</button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={closeModal} title={editing ? 'Edit Manufacturer' : 'Add Manufacturer'} size="lg">
        <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form) }} className="space-y-4">
          <div>
            <label className="label">Name <span className="text-red-500">*</span></label>
            <input className="input" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Website</label>
              <input className="input" type="url" placeholder="https://example.com" value={form.website} onChange={e => setForm((f: any) => ({ ...f, website: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} />
          </div>
          {editing && (
            <div className="flex items-center gap-2">
              <input
                id="mfr-active"
                type="checkbox"
                checked={form.isActive}
                onChange={e => setForm((f: any) => ({ ...f, isActive: e.target.checked }))}
                className="rounded border-slate-300"
              />
              <label htmlFor="mfr-active" className="text-sm text-slate-700">Active</label>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary disabled:opacity-50">
              {saveMutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Manufacturer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
