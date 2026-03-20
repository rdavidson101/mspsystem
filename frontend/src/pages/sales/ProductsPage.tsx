import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, Search, Edit2, Trash2, Package, ToggleLeft, ToggleRight } from 'lucide-react'

const CATEGORIES = ['Hardware', 'Software', 'Licence', 'Service', 'Support', 'Other']
const UNITS = ['each', 'per month', 'per year', 'per user/month', 'per user/year', 'per device/month', 'per device/year', 'per hour']

const EMPTY_FORM = {
  sku: '', name: '', description: '', category: '', price: '', cost: '', unit: '', isActive: true,
}

export default function ProductsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 10

  const { data: products = [] } = useQuery({
    queryKey: ['products', search, categoryFilter],
    queryFn: () => api.get('/products', { params: { search: search || undefined, category: categoryFilter || undefined } }).then(r => r.data),
  })

  const saveMut = useMutation({
    mutationFn: (data: any) => editing
      ? api.patch(`/products/${editing.id}`, data).then(r => r.data)
      : api.post('/products', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); closeModal() },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: any) => api.patch(`/products/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  function openEdit(p: any) {
    setEditing(p)
    setForm({ sku: p.sku, name: p.name, description: p.description || '', category: p.category || '', price: p.price ?? '', cost: p.cost ?? '', unit: p.unit || '', isActive: p.isActive })
    setShowModal(true)
  }
  function closeModal() { setShowModal(false); setEditing(null); setForm(EMPTY_FORM) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    saveMut.mutate({
      ...form,
      price: form.price !== '' ? parseFloat(String(form.price)) : null,
      cost: form.cost !== '' ? parseFloat(String(form.cost)) : null,
      category: form.category || null,
      unit: form.unit || null,
      description: form.description || null,
    })
  }

  const filtered = products
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const margin = (p: any) => {
    if (p.price == null || p.cost == null || p.cost === 0) return null
    return (((p.price - p.cost) / p.price) * 100).toFixed(0)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products & SKUs</h1>
          <p className="text-sm text-slate-500 mt-0.5">{products.length} product{products.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} placeholder="Search name or SKU…" className="input pl-9 text-sm w-full" />
        </div>
        <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(0) }} className="input w-40 text-sm">
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-medium text-slate-600">SKU</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Category</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Unit</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Cost</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Price</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Margin</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.map((p: any) => {
              const m = margin(p)
              return (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{p.name}</div>
                    {p.description && <div className="text-xs text-slate-400 truncate max-w-xs mt-0.5">{p.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {p.category && <span className="badge text-xs bg-slate-100 text-slate-600">{p.category}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{p.unit || '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{p.cost != null ? `£${Number(p.cost).toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{p.price != null ? `£${Number(p.price).toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {m != null && (
                      <span className={`text-xs font-medium ${Number(m) >= 30 ? 'text-green-600' : Number(m) >= 10 ? 'text-orange-500' : 'text-red-500'}`}>
                        {m}%
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleMut.mutate({ id: p.id, isActive: !p.isActive })} className="text-slate-400 hover:text-slate-600">
                      {p.isActive
                        ? <ToggleRight size={20} className="text-green-500" />
                        : <ToggleLeft size={20} className="text-slate-300" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteMut.mutate(p.id) }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {paginated.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-16 text-center">
                <Package size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="font-medium text-slate-500">No products yet</p>
                <p className="text-sm text-slate-400 mt-1">Add your first product or SKU to get started</p>
              </td></tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div className="flex gap-1">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Previous</button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">{editing ? 'Edit Product' : 'Add Product'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">SKU <span className="text-red-500">*</span></label>
                  <input required className="input" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. SW-365-BUS" />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">Select…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Name <span className="text-red-500">*</span></label>
                <input required className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Microsoft 365 Business Standard" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description…" />
              </div>
              <div>
                <label className="label">Unit</label>
                <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                  <option value="">Select…</option>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Cost price (£)</label>
                  <input type="number" step="0.01" min="0" className="input" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <label className="label">Sell price (£)</label>
                  <input type="number" step="0.01" min="0" className="input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
                </div>
              </div>
              {form.price !== '' && form.cost !== '' && Number(form.cost) > 0 && (
                <p className="text-xs text-slate-500">
                  Margin: <span className="font-medium text-slate-700">{(((Number(form.price) - Number(form.cost)) / Number(form.price)) * 100).toFixed(1)}%</span>
                </p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saveMut.isPending} className="btn-primary disabled:opacity-50">
                  {saveMut.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
