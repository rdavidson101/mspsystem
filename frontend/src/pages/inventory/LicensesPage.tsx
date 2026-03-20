import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, Edit2, Trash2, Key, Search } from 'lucide-react'
import Modal from '@/components/ui/Modal'

const PAGE_SIZE = 10
import clsx from 'clsx'
import { format, isAfter, isBefore, addDays } from 'date-fns'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

const emptyForm = {
  name: '',
  productKey: '',
  seats: '',
  seatsUsed: '',
  expiresAt: '',
  purchasedAt: '',
  cost: '',
  vendorId: '',
  companyId: '',
  notes: '',
}

function expiryClass(expiresAt: string | null): string {
  if (!expiresAt) return ''
  const exp = new Date(expiresAt)
  const now = new Date()
  if (isBefore(exp, now)) return 'bg-red-50'
  if (isBefore(exp, addDays(now, 30))) return 'bg-amber-50'
  return ''
}

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <span className="text-slate-400">—</span>
  const exp = new Date(expiresAt)
  const now = new Date()
  const expired = isBefore(exp, now)
  const soonExpiry = !expired && isBefore(exp, addDays(now, 30))
  return (
    <span className={clsx('text-sm', expired ? 'text-red-600 font-medium' : soonExpiry ? 'text-amber-600 font-medium' : 'text-slate-600')}>
      {format(exp, 'dd MMM yyyy')}
      {expired && <span className="ml-1 text-xs">(expired)</span>}
      {soonExpiry && <span className="ml-1 text-xs">(soon)</span>}
    </span>
  )
}

function SeatBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-primary-500'
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 whitespace-nowrap">{used}/{total}</span>
    </div>
  )
}

export default function LicensesPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>(emptyForm)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [vendorFilter, setVendorFilter] = useState('')
  const [expiryFilter, setExpiryFilter] = useState('')

  const { data: licenses = [] } = useQuery({
    queryKey: ['licenses'],
    queryFn: () => api.get('/inventory/licenses').then(r => r.data),
  })
  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.get('/inventory/vendors').then(r => r.data),
  })
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      const payload = {
        ...data,
        seats: data.seats !== '' ? Number(data.seats) : null,
        seatsUsed: data.seatsUsed !== '' ? Number(data.seatsUsed) : 0,
        cost: data.cost !== '' ? Number(data.cost) : null,
        vendorId: data.vendorId || null,
        companyId: data.companyId || null,
        expiresAt: data.expiresAt || null,
        purchasedAt: data.purchasedAt || null,
        productKey: data.productKey || null,
        notes: data.notes || null,
      }
      return editing
        ? api.patch(`/inventory/licenses/${editing.id}`, payload)
        : api.post('/inventory/licenses', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['licenses'] }); closeModal() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/licenses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['licenses'] }),
  })

  function openAdd() { setEditing(null); setForm({ ...emptyForm }); setShowModal(true) }
  function openEdit(l: any) {
    setEditing(l)
    setForm({
      name: l.name || '',
      productKey: l.productKey || '',
      seats: l.seats != null ? String(l.seats) : '',
      seatsUsed: l.seatsUsed != null ? String(l.seatsUsed) : '',
      expiresAt: l.expiresAt ? l.expiresAt.slice(0, 10) : '',
      purchasedAt: l.purchasedAt ? l.purchasedAt.slice(0, 10) : '',
      cost: l.cost != null ? String(l.cost) : '',
      vendorId: l.vendorId || '',
      companyId: l.companyId || '',
      notes: l.notes || '',
    })
    setShowModal(true)
  }
  function closeModal() { setShowModal(false); setEditing(null) }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f: any) => ({ ...f, [field]: e.target.value }))

  const vendorOptions = [...new Set(licenses.map((l: any) => l.vendor?.name).filter(Boolean))].sort() as string[]
  const now = new Date()
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const filtered = licenses.filter((l: any) => {
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !(l.vendor?.name || '').toLowerCase().includes(search.toLowerCase())) return false
    if (vendorFilter && l.vendor?.name !== vendorFilter) return false
    if (expiryFilter === 'expired' && !(l.expiresAt && new Date(l.expiresAt) < now)) return false
    if (expiryFilter === 'soon' && !(l.expiresAt && new Date(l.expiresAt) >= now && new Date(l.expiresAt) <= soon)) return false
    if (expiryFilter === 'active' && !(!l.expiresAt || new Date(l.expiresAt) > soon)) return false
    return true
  })
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pagedLicenses = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Licenses</h1>
          <p className="text-sm text-slate-500 mt-0.5">{licenses.length} license{licenses.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add License
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} placeholder="Search…" className="input pl-9 text-sm w-full" />
        </div>
        <select value={vendorFilter} onChange={e => { setVendorFilter(e.target.value); setPage(0) }} className="input text-sm w-auto">
          <option value="">All Vendors</option>
          {vendorOptions.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select value={expiryFilter} onChange={e => { setExpiryFilter(e.target.value); setPage(0) }} className="input text-sm w-auto">
          <option value="">All Expiry</option>
          <option value="expired">Expired</option>
          <option value="soon">Expiring Soon</option>
          <option value="active">Active</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Vendor</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Seats</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Expires</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Cost</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-400">
                  {licenses.length === 0 ? 'No licenses yet' : 'No licenses match your filters'}
                </td>
              </tr>
            )}
            {pagedLicenses.map((l: any) => (
              <tr key={l.id} className={clsx('transition-colors', expiryClass(l.expiresAt) || 'hover:bg-slate-50')}>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Key size={13} className="text-primary-600" />
                    </div>
                    <span className="font-medium text-slate-900 text-sm">{l.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{l.vendor?.name || '—'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{l.company?.name || '—'}</td>
                <td className="py-3 px-4">
                  {l.seats != null ? (
                    <SeatBar used={l.seatsUsed ?? 0} total={l.seats} />
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <ExpiryBadge expiresAt={l.expiresAt} />
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {l.cost != null ? `£${Number(l.cost).toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : '—'}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(l)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                    <button
                      onClick={() => { if (confirm('Delete this license?')) deleteMutation.mutate(l.id) }}
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
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-1">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Previous</button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={closeModal} title={editing ? 'Edit License' : 'Add License'} size="lg">
        <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form) }} className="space-y-4">
          <div>
            <label className="label">Product Name <span className="text-red-500">*</span></label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Microsoft 365 Business Premium" required />
          </div>
          <div>
            <label className="label">Product Key / License Key</label>
            <input className="input font-mono text-sm" value={form.productKey} onChange={set('productKey')} placeholder="Optional" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Seats (total)</label>
              <input className="input" type="number" min="0" value={form.seats} onChange={set('seats')} placeholder="Leave blank if unlimited" />
            </div>
            <div>
              <label className="label">Seats Used</label>
              <input className="input" type="number" min="0" value={form.seatsUsed} onChange={set('seatsUsed')} />
            </div>
            <div>
              <label className="label">Purchase Date</label>
              <input className="input" type="date" value={form.purchasedAt} onChange={set('purchasedAt')} />
            </div>
            <div>
              <label className="label">Expiry Date</label>
              <input className="input" type="date" value={form.expiresAt} onChange={set('expiresAt')} />
            </div>
            <div>
              <label className="label">Cost (£)</label>
              <input className="input" type="number" step="0.01" min="0" value={form.cost} onChange={set('cost')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Vendor</label>
              <SearchableSelect
                value={form.vendorId}
                onChange={val => setForm((f: any) => ({ ...f, vendorId: val }))}
                options={vendors.map((v: any) => ({ value: v.id, label: v.name }))}
                placeholder="None"
                emptyLabel="None"
              />
            </div>
            <div>
              <label className="label">Customer</label>
              <SearchableSelect
                value={form.companyId}
                onChange={val => setForm((f: any) => ({ ...f, companyId: val }))}
                options={companies.map((c: any) => ({ value: c.id, label: c.name }))}
                placeholder="None"
                emptyLabel="None"
              />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={set('notes')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary disabled:opacity-50">
              {saveMutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add License'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
