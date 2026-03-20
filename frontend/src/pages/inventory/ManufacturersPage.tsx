import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, Pencil, Trash2, Factory } from 'lucide-react'
import Modal from '@/components/ui/Modal'

const emptyForm = { name: '', website: '', phone: '', email: '', notes: '', isActive: true }

export default function ManufacturersPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>(emptyForm)

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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manufacturers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage hardware and equipment manufacturers</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Manufacturer
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Name</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Website</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Phone</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Email</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Assets</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {manufacturers.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">No manufacturers yet</td></tr>
            )}
            {manufacturers.map((m: any) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Factory size={13} className="text-slate-500" />
                    </div>
                    <div>
                      <span className="font-medium text-slate-900 text-sm">{m.name}</span>
                      {!m.isActive && (
                        <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Inactive</span>
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
                    <button onClick={() => openEdit(m)} className="p-1.5 hover:bg-primary-50 hover:text-primary-600 rounded text-slate-400 transition-colors"><Pencil size={14} /></button>
                    <button
                      onClick={() => { if (confirm('Delete this manufacturer?')) deleteMutation.mutate(m.id) }}
                      className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded text-slate-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary text-sm disabled:opacity-50">
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
