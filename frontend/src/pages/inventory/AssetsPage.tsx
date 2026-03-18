import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, Pencil, Trash2, Send, Package } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import clsx from 'clsx'
import { format } from 'date-fns'

const statusColors: Record<string, string> = {
  IN_STOCK: 'bg-green-100 text-green-700',
  DEPLOYED: 'bg-blue-100 text-blue-700',
  SHIPPING: 'bg-amber-100 text-amber-700',
  LOST: 'bg-orange-100 text-orange-700',
  STOLEN: 'bg-red-100 text-red-700',
  DECOMMISSIONED: 'bg-slate-100 text-slate-500',
}

const statusLabels: Record<string, string> = {
  IN_STOCK: 'In Stock',
  DEPLOYED: 'Deployed',
  SHIPPING: 'Shipping',
  LOST: 'Lost',
  STOLEN: 'Stolen',
  DECOMMISSIONED: 'Decommissioned',
}

const emptyAsset = { name: '', modelNumber: '', serialNumber: '', status: 'IN_STOCK', manufacturerId: '', companyId: '', purchaseDate: '', purchasePrice: '', warrantyExpiry: '', notes: '' }
const emptyShipment = { recipientName: '', company: '', addressLine1: '', addressLine2: '', city: '', state: '', zip: '', country: 'UK', purpose: '', notes: '' }

export default function AssetsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [showAssetModal, setShowAssetModal] = useState(false)
  const [showShipModal, setShowShipModal] = useState(false)
  const [editAsset, setEditAsset] = useState<any>(null)
  const [shipAsset, setShipAsset] = useState<any>(null)
  const [assetForm, setAssetForm] = useState<any>(emptyAsset)
  const [shipForm, setShipForm] = useState<any>(emptyShipment)

  const { data: assets = [] } = useQuery({ queryKey: ['assets', statusFilter], queryFn: () => api.get('/inventory/assets', { params: statusFilter ? { status: statusFilter } : {} }).then(r => r.data) })
  const { data: manufacturers = [] } = useQuery({ queryKey: ['manufacturers'], queryFn: () => api.get('/inventory/manufacturers').then(r => r.data) })
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) })

  const saveMutation = useMutation({
    mutationFn: (data: any) => editAsset ? api.patch(`/inventory/assets/${editAsset.id}`, data) : api.post('/inventory/assets', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); setShowAssetModal(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/assets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })

  const shipMutation = useMutation({
    mutationFn: (data: any) => api.post(`/inventory/assets/${shipAsset.id}/ship`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); qc.invalidateQueries({ queryKey: ['shipments'] }); setShowShipModal(false); setShipForm(emptyShipment) },
  })

  function openCreate() { setEditAsset(null); setAssetForm({ ...emptyAsset }); setShowAssetModal(true) }
  function openEdit(a: any) { setEditAsset(a); setAssetForm({ ...a, manufacturerId: a.manufacturerId || '', companyId: a.companyId || '', purchaseDate: a.purchaseDate ? a.purchaseDate.slice(0, 10) : '', warrantyExpiry: a.warrantyExpiry ? a.warrantyExpiry.slice(0, 10) : '' }); setShowAssetModal(true) }
  function openShip(a: any) { setShipAsset(a); setShowShipModal(true) }

  const statusCounts = assets.reduce((acc: any, a: any) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc }, {})

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assets</h1>
          <p className="text-sm text-slate-500">{assets.length} total assets</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Asset
        </button>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setStatusFilter('')} className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', !statusFilter ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
          All <span className="ml-1 opacity-70">{assets.length}</span>
        </button>
        {Object.entries(statusColors).map(([s]) => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)} className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', statusFilter === s ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
            {statusLabels[s]} <span className="ml-1 opacity-70">{statusCounts[s] || 0}</span>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Asset #</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Name</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Manufacturer</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Model</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Serial</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Assigned To</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Status</th>
              <th className="py-3 px-4 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a: any) => (
              <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-mono text-xs font-semibold text-primary-600">{a.ref}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Package size={14} className="text-slate-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-800">{a.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{a.manufacturer?.name || '—'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{a.modelNumber || '—'}</td>
                <td className="py-3 px-4 text-xs font-mono text-slate-500">{a.serialNumber || '—'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{a.company?.name || '—'}</td>
                <td className="py-3 px-4">
                  <span className={clsx('badge text-xs', statusColors[a.status])}>{statusLabels[a.status]}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1 justify-end">
                    {(a.status === 'IN_STOCK' || a.status === 'DEPLOYED') && (
                      <button onClick={() => openShip(a)} className="p-1.5 hover:bg-amber-50 rounded text-slate-400 hover:text-amber-500" title="Send for shipping">
                        <Send size={14} />
                      </button>
                    )}
                    <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deleteMutation.mutate(a.id)} className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-sm text-slate-400">No assets found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Asset Modal */}
      <Modal open={showAssetModal} onClose={() => setShowAssetModal(false)} title={editAsset ? 'Edit Asset' : 'Add Asset'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Asset Name *</label>
            <input className="input" value={assetForm.name} onChange={e => setAssetForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="e.g. MacBook Pro 14-inch" />
          </div>
          <div>
            <label className="label">Manufacturer</label>
            <select className="input" value={assetForm.manufacturerId} onChange={e => setAssetForm((f: any) => ({ ...f, manufacturerId: e.target.value }))}>
              <option value="">Select manufacturer</option>
              {manufacturers.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Model Number</label>
            <input className="input" value={assetForm.modelNumber} onChange={e => setAssetForm((f: any) => ({ ...f, modelNumber: e.target.value }))} />
          </div>
          <div>
            <label className="label">Serial Number</label>
            <input className="input" value={assetForm.serialNumber} onChange={e => setAssetForm((f: any) => ({ ...f, serialNumber: e.target.value }))} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={assetForm.status} onChange={e => setAssetForm((f: any) => ({ ...f, status: e.target.value }))}>
              {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Assigned Client</label>
            <select className="input" value={assetForm.companyId} onChange={e => setAssetForm((f: any) => ({ ...f, companyId: e.target.value }))}>
              <option value="">Unassigned</option>
              {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Purchase Date</label>
            <input className="input" type="date" value={assetForm.purchaseDate} onChange={e => setAssetForm((f: any) => ({ ...f, purchaseDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">Purchase Price (£)</label>
            <input className="input" type="number" step="0.01" value={assetForm.purchasePrice} onChange={e => setAssetForm((f: any) => ({ ...f, purchasePrice: e.target.value }))} />
          </div>
          <div>
            <label className="label">Warranty Expiry</label>
            <input className="input" type="date" value={assetForm.warrantyExpiry} onChange={e => setAssetForm((f: any) => ({ ...f, warrantyExpiry: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={assetForm.notes} onChange={e => setAssetForm((f: any) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={() => setShowAssetModal(false)} className="btn-secondary text-sm">Cancel</button>
          <button onClick={() => saveMutation.mutate(assetForm)} disabled={!assetForm.name || saveMutation.isPending} className="btn-primary text-sm disabled:opacity-50">
            {saveMutation.isPending ? 'Saving…' : 'Save Asset'}
          </button>
        </div>
      </Modal>

      {/* Shipment Modal */}
      <Modal open={showShipModal} onClose={() => setShowShipModal(false)} title={`Send for Shipping — ${shipAsset?.ref}`} size="lg">
        <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-700">
          <span className="font-medium">{shipAsset?.name}</span>
          {shipAsset?.serialNumber && <span className="text-slate-500 ml-2">S/N: {shipAsset.serialNumber}</span>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Recipient Name *</label>
            <input className="input" value={shipForm.recipientName} onChange={e => setShipForm((f: any) => ({ ...f, recipientName: e.target.value }))} />
          </div>
          <div>
            <label className="label">Company</label>
            <input className="input" value={shipForm.company} onChange={e => setShipForm((f: any) => ({ ...f, company: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="label">Address Line 1 *</label>
            <input className="input" value={shipForm.addressLine1} onChange={e => setShipForm((f: any) => ({ ...f, addressLine1: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="label">Address Line 2</label>
            <input className="input" value={shipForm.addressLine2} onChange={e => setShipForm((f: any) => ({ ...f, addressLine2: e.target.value }))} />
          </div>
          <div>
            <label className="label">City *</label>
            <input className="input" value={shipForm.city} onChange={e => setShipForm((f: any) => ({ ...f, city: e.target.value }))} />
          </div>
          <div>
            <label className="label">County / State</label>
            <input className="input" value={shipForm.state} onChange={e => setShipForm((f: any) => ({ ...f, state: e.target.value }))} />
          </div>
          <div>
            <label className="label">Postcode</label>
            <input className="input" value={shipForm.zip} onChange={e => setShipForm((f: any) => ({ ...f, zip: e.target.value }))} />
          </div>
          <div>
            <label className="label">Country</label>
            <input className="input" value={shipForm.country} onChange={e => setShipForm((f: any) => ({ ...f, country: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="label">Purpose *</label>
            <input className="input" value={shipForm.purpose} placeholder="e.g. New starter equipment, Replacement laptop" onChange={e => setShipForm((f: any) => ({ ...f, purpose: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={shipForm.notes} onChange={e => setShipForm((f: any) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={() => setShowShipModal(false)} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={() => shipMutation.mutate(shipForm)}
            disabled={!shipForm.recipientName || !shipForm.addressLine1 || !shipForm.city || !shipForm.purpose || shipMutation.isPending}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Send size={14} /> {shipMutation.isPending ? 'Creating…' : 'Create Shipment Request'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
