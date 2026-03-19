import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, Pencil, Trash2, ShoppingBag } from 'lucide-react'
import Modal from '@/components/ui/Modal'

const emptyForm = { name: '', contactName: '', email: '', phone: '', website: '', notes: '', isActive: true }

export default function VendorsPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>(emptyForm)

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.get('/inventory/vendors').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editing
        ? api.patch(`/inventory/vendors/${editing.id}`, data)
        : api.post('/inventory/vendors', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); closeModal() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/vendors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  })

  function openAdd() { setEditing(null); setForm({ ...emptyForm }); setShowModal(true) }
  function openEdit(v: any) {
    setEditing(v)
    setForm({
      name: v.name || '',
      contactName: v.contactName || '',
      email: v.email || '',
      phone: v.phone || '',
      website: v.website || '',
      notes: v.notes || '',
      isActive: v.isActive ?? true,
    })
    setShowModal(true)
  }
  function closeModal() { setShowModal(false); setEditing(null) }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your suppliers and vendors</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Vendor
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Name</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Contact</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Email</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Phone</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Assets</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Licenses</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vendors.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">No vendors yet</td></tr>
            )}
            {vendors.map((v: any) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-primary-100 rounded-lg flex items-center justify-center">
                      <ShoppingBag size={13} className="text-primary-600" />
                    </div>
                    <div>
                      <span className="font-medium text-slate-900 text-sm">{v.name}</span>
                      {!v.isActive && (
                        <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Inactive</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{v.contactName || '—'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{v.email || '—'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{v.phone || '—'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{v._count?.assets ?? 0}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{v._count?.licenses ?? 0}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(v)} className="p-1.5 hover:bg-primary-50 hover:text-primary-600 rounded text-slate-400 transition-colors"><Pencil size={14} /></button>
                    <button
                      onClick={() => { if (confirm('Delete this vendor?')) deleteMutation.mutate(v.id) }}
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

      <Modal open={showModal} onClose={closeModal} title={editing ? 'Edit Vendor' : 'Add Vendor'} size="lg">
        <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form) }} className="space-y-4">
          <div>
            <label className="label">Name <span className="text-red-500">*</span></label>
            <input className="input" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Contact Name</label>
              <input className="input" value={form.contactName} onChange={e => setForm((f: any) => ({ ...f, contactName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Website</label>
              <input className="input" type="url" placeholder="https://example.com" value={form.website} onChange={e => setForm((f: any) => ({ ...f, website: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="vendor-active"
              type="checkbox"
              checked={form.isActive}
              onChange={e => setForm((f: any) => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-slate-300"
            />
            <label htmlFor="vendor-active" className="text-sm text-slate-700">Active</label>
          </div>
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
