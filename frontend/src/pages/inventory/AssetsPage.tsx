import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCurrency } from '@/lib/useCurrency'
import { Plus, Edit2, Trash2, Send, Package } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import clsx from 'clsx'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

const PAGE_SIZE = 10

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

const emptyAsset = {
  name: '',
  modelNumber: '',
  serialNumber: '',
  status: 'IN_STOCK',
  manufacturerId: '',
  companyId: '',
  purchaseDate: '',
  purchasePrice: '',
  warrantyExpiry: '',
  notes: '',
  assetTypeId: '',
  vendorId: '',
  assigneeType: '',
  assigneeUserId: '',
  assigneeContactId: '',
}

const emptyShipment = { recipientName: '', company: '', addressLine1: '', addressLine2: '', city: '', state: '', zip: '', country: 'UK', purpose: '', notes: '' }

function assigneeLabel(a: any): string {
  if (!a.assigneeType) return '—'
  if (a.assigneeType === 'CUSTOMER_SITE') return 'Customer Site'
  if (a.assigneeType === 'USER' && a.assigneeUser) return a.assigneeUser.name || a.assigneeUser.email
  if (a.assigneeType === 'CONTACT' && a.assigneeContact) return `${a.assigneeContact.firstName || ''} ${a.assigneeContact.lastName || ''}`.trim()
  return '—'
}

export default function AssetsPage() {
  const qc = useQueryClient()
  const { symbol } = useCurrency()
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [showAssetModal, setShowAssetModal] = useState(false)
  const [showShipModal, setShowShipModal] = useState(false)
  const [editAsset, setEditAsset] = useState<any>(null)
  const [shipAsset, setShipAsset] = useState<any>(null)
  const [assetForm, setAssetForm] = useState<any>(emptyAsset)
  const [shipForm, setShipForm] = useState<any>(emptyShipment)

  const { data: assets = [] } = useQuery({ queryKey: ['assets', statusFilter], queryFn: () => api.get('/inventory/assets', { params: statusFilter ? { status: statusFilter } : {} }).then(r => r.data) })
  const { data: manufacturers = [] } = useQuery({ queryKey: ['manufacturers'], queryFn: () => api.get('/inventory/manufacturers').then(r => r.data) })
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) })
  const { data: assetTypes = [] } = useQuery({ queryKey: ['asset-types'], queryFn: () => api.get('/inventory/asset-types').then(r => r.data) })
  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: () => api.get('/inventory/vendors').then(r => r.data) })
  const { data: internalUsers = [] } = useQuery({ queryKey: ['users', 'INTERNAL'], queryFn: () => api.get('/users', { params: { type: 'INTERNAL' } }).then(r => r.data) })
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => api.get('/contacts').then(r => r.data),
    enabled: assetForm.assigneeType === 'CONTACT',
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      const payload = {
        ...data,
        assetTypeId: data.assetTypeId || null,
        vendorId: data.vendorId || null,
        manufacturerId: data.manufacturerId || null,
        companyId: data.companyId || null,
        assigneeType: data.assigneeType || null,
        assigneeUserId: data.assigneeType === 'USER' ? (data.assigneeUserId || null) : null,
        assigneeContactId: data.assigneeType === 'CONTACT' ? (data.assigneeContactId || null) : null,
      }
      return editAsset ? api.patch(`/inventory/assets/${editAsset.id}`, payload) : api.post('/inventory/assets', payload)
    },
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
  function openEdit(a: any) {
    setEditAsset(a)
    setAssetForm({
      ...emptyAsset,
      ...a,
      manufacturerId: a.manufacturerId || '',
      companyId: a.companyId || '',
      purchaseDate: a.purchaseDate ? a.purchaseDate.slice(0, 10) : '',
      warrantyExpiry: a.warrantyExpiry ? a.warrantyExpiry.slice(0, 10) : '',
      assetTypeId: a.assetTypeId || '',
      vendorId: a.vendorId || '',
      assigneeType: a.assigneeType || '',
      assigneeUserId: a.assigneeUserId || '',
      assigneeContactId: a.assigneeContactId || '',
    })
    setShowAssetModal(true)
  }
  function openShip(a: any) { setShipAsset(a); setShowShipModal(true) }

  const statusCounts = assets.reduce((acc: any, a: any) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc }, {})
  const totalPages = Math.ceil(assets.length / PAGE_SIZE)
  const pagedAssets = assets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const setField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setAssetForm((f: any) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assets</h1>
          <p className="text-sm text-slate-500 mt-0.5">{assets.length} asset{assets.length !== 1 ? 's' : ''}</p>
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-medium text-slate-600">Asset #</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Manufacturer</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Model</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Serial</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Assignee</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagedAssets.map((a: any) => (
              <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-mono text-xs font-semibold text-primary-600">{a.ref}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Package size={14} className="text-slate-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-800">{a.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{a.assetType?.name || '—'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{a.manufacturer?.name || '—'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{a.modelNumber || '—'}</td>
                <td className="py-3 px-4 text-xs font-mono text-slate-500">{a.serialNumber || '—'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{assigneeLabel(a)}</td>
                <td className="py-3 px-4">
                  <span className={clsx('badge text-xs', statusColors[a.status])}>{statusLabels[a.status]}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1 justify-end">
                    {(a.status === 'IN_STOCK' || a.status === 'DEPLOYED') && (
                      <button onClick={() => openShip(a)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Send for shipping">
                        <Send size={14} />
                      </button>
                    )}
                    <button onClick={() => openEdit(a)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => { if (confirm('Delete this asset?')) deleteMutation.mutate(a.id) }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-sm text-slate-400">No assets yet</td>
              </tr>
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, assets.length)} of {assets.length}
            </span>
            <div className="flex gap-1">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Previous</button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Asset Modal */}
      <Modal open={showAssetModal} onClose={() => setShowAssetModal(false)} title={editAsset ? 'Edit Asset' : 'Add Asset'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Asset Name *</label>
            <input className="input" value={assetForm.name} onChange={setField('name')} placeholder="e.g. MacBook Pro 14-inch" />
          </div>
          <div>
            <label className="label">Asset Type</label>
            <SearchableSelect
              value={assetForm.assetTypeId}
              onChange={val => setAssetForm((f: any) => ({ ...f, assetTypeId: val }))}
              options={assetTypes.map((t: any) => ({ value: t.id, label: t.name }))}
              placeholder="Select type"
              emptyLabel="None"
            />
          </div>
          <div>
            <label className="label">Manufacturer</label>
            <SearchableSelect
              value={assetForm.manufacturerId}
              onChange={val => setAssetForm((f: any) => ({ ...f, manufacturerId: val }))}
              options={manufacturers.map((m: any) => ({ value: m.id, label: m.name }))}
              placeholder="Select manufacturer"
              emptyLabel="None"
            />
          </div>
          <div>
            <label className="label">Vendor</label>
            <SearchableSelect
              value={assetForm.vendorId}
              onChange={val => setAssetForm((f: any) => ({ ...f, vendorId: val }))}
              options={vendors.map((v: any) => ({ value: v.id, label: v.name }))}
              placeholder="Select vendor"
              emptyLabel="None"
            />
          </div>
          <div>
            <label className="label">Model Number</label>
            <input className="input" value={assetForm.modelNumber} onChange={setField('modelNumber')} />
          </div>
          <div>
            <label className="label">Serial Number</label>
            <input className="input" value={assetForm.serialNumber} onChange={setField('serialNumber')} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={assetForm.status} onChange={setField('status')}>
              {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Assigned Client</label>
            <SearchableSelect
              value={assetForm.companyId}
              onChange={val => setAssetForm((f: any) => ({ ...f, companyId: val }))}
              options={companies.map((c: any) => ({ value: c.id, label: c.name }))}
              placeholder="Unassigned"
              emptyLabel="Unassigned"
            />
          </div>
          {/* Assignee type */}
          <div className={assetForm.assigneeType && assetForm.assigneeType !== 'CUSTOMER_SITE' ? '' : 'col-span-2'}>
            <label className="label">Assignee Type</label>
            <select className="input" value={assetForm.assigneeType} onChange={e => setAssetForm((f: any) => ({ ...f, assigneeType: e.target.value, assigneeUserId: '', assigneeContactId: '' }))}>
              <option value="">None</option>
              <option value="USER">MSP Staff</option>
              <option value="CONTACT">Customer Contact</option>
              <option value="CUSTOMER_SITE">Customer Site</option>
            </select>
          </div>
          {assetForm.assigneeType === 'USER' && (
            <div>
              <label className="label">Staff Member</label>
              <SearchableSelect
                value={assetForm.assigneeUserId}
                onChange={val => setAssetForm((f: any) => ({ ...f, assigneeUserId: val }))}
                options={internalUsers.map((u: any) => ({ value: u.id, label: u.name || u.email }))}
                placeholder="Select user"
                emptyLabel="None"
              />
            </div>
          )}
          {assetForm.assigneeType === 'CONTACT' && (
            <div>
              <label className="label">Contact</label>
              <SearchableSelect
                value={assetForm.assigneeContactId}
                onChange={val => setAssetForm((f: any) => ({ ...f, assigneeContactId: val }))}
                options={contacts.map((c: any) => ({ value: c.id, label: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email }))}
                placeholder="Select contact"
                emptyLabel="None"
              />
            </div>
          )}
          <div>
            <label className="label">Purchase Date</label>
            <input className="input" type="date" value={assetForm.purchaseDate} onChange={setField('purchaseDate')} />
          </div>
          <div>
            <label className="label">Purchase Price ({symbol})</label>
            <input className="input" type="number" step="0.01" value={assetForm.purchasePrice} onChange={setField('purchasePrice')} />
          </div>
          <div>
            <label className="label">Warranty Expiry</label>
            <input className="input" type="date" value={assetForm.warrantyExpiry} onChange={setField('warrantyExpiry')} />
          </div>
          <div className="col-span-2">
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={assetForm.notes} onChange={setField('notes')} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => setShowAssetModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={() => saveMutation.mutate(assetForm)} disabled={!assetForm.name || saveMutation.isPending} className="btn-primary disabled:opacity-50">
            {saveMutation.isPending ? 'Saving…' : editAsset ? 'Save Changes' : 'Add Asset'}
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
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => setShowShipModal(false)} className="btn-secondary">Cancel</button>
          <button
            onClick={() => shipMutation.mutate(shipForm)}
            disabled={!shipForm.recipientName || !shipForm.addressLine1 || !shipForm.city || !shipForm.purpose || shipMutation.isPending}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Send size={14} /> {shipMutation.isPending ? 'Creating…' : 'Create Shipment Request'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
