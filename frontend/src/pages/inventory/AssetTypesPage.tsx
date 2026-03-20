import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import Modal from '@/components/ui/Modal'

export default function AssetTypesPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name: '', description: '' })

  const { data: types = [] } = useQuery({ queryKey: ['asset-types'], queryFn: () => api.get('/inventory/asset-types').then(r => r.data) })

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? api.patch(`/inventory/asset-types/${editing.id}`, data) : api.post('/inventory/asset-types', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['asset-types'] }); closeModal() },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/asset-types/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asset-types'] }),
  })

  function openAdd() { setEditing(null); setForm({ name: '', description: '' }); setShowModal(true) }
  function openEdit(t: any) { setEditing(t); setForm({ name: t.name, description: t.description || '' }); setShowModal(true) }
  function closeModal() { setShowModal(false); setEditing(null) }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asset Types</h1>
          <p className="text-sm text-slate-500 mt-0.5">Define categories for your assets</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Type
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Name</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Description</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Assets</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {types.length === 0 && (
              <tr><td colSpan={4} className="text-center py-12 text-slate-400 text-sm">No asset types yet</td></tr>
            )}
            {types.map((t: any) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Tag size={13} className="text-primary-600" />
                    </div>
                    <span className="font-medium text-slate-900 text-sm">{t.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-500">{t.description || '—'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{t._count?.assets ?? 0}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-primary-50 hover:text-primary-600 rounded text-slate-400 transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => { if (confirm('Delete this asset type?')) deleteMutation.mutate(t.id) }} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded text-slate-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={closeModal} title={editing ? 'Edit Asset Type' : 'Add Asset Type'}>
        <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form) }} className="space-y-4">
          <div>
            <label className="label">Name <span className="text-red-500">*</span></label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" className="btn-primary text-sm">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
