import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, Pencil, Trash2, Key } from 'lucide-react'
import Modal from '@/components/ui/Modal'
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Licenses</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track software licenses and subscriptions</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add License
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Name</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Vendor</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Customer</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Seats</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Expires</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Cost</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {licenses.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">No licenses yet</td></tr>
            )}
            {licenses.map((l: any) => (
              <tr key={l.id} className={clsx('hover:bg-opacity-80 transition-colors', expiryClass(l.expiresAt) || 'hover:bg-slate-50')}>
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
                    <button onClick={() => openEdit(l)} className="p-1.5 hover:bg-primary-50 hover:text-primary-600 rounded text-slate-400 transition-colors"><Pencil size={14} /></button>
                    <button
                      onClick={() => { if (confirm('Delete this license?')) deleteMutation.mutate(l.id) }}
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
