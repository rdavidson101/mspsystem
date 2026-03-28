import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCurrency } from '@/lib/useCurrency'
import { Plus, FileText, Search, PenLine, Trash2, FileCheck2, RefreshCw, CheckCircle2, X } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import Modal from '@/components/ui/Modal'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

const statusColors: Record<string, string> = {
  DRAFT:     'bg-slate-100 text-slate-600',
  ACTIVE:    'bg-green-100 text-green-700',
  EXPIRED:   'bg-red-100 text-red-700',
  CANCELLED: 'bg-orange-100 text-orange-700',
}

const BILLING_CYCLES = ['Monthly', 'Quarterly', 'Annual', 'One-time']

const emptyForm = {
  name: '', description: '', status: 'DRAFT', companyId: '',
  value: '', startDate: '', endDate: '', billingCycle: 'Monthly',
}
type Item = { productId: string; description: string; quantity: number; unitPrice: number; total: number }

const emptyItem = (): Item => ({ productId: '', description: '', quantity: 1, unitPrice: 0, total: 0 })

export default function ContractsPage() {
  const qc = useQueryClient()
  const { symbol, fmt } = useCurrency()

  const [showModal, setShowModal]       = useState(false)
  const [editContract, setEditContract] = useState<any>(null)
  const [form, setForm]                 = useState({ ...emptyForm })
  const [items, setItems]               = useState<Item[]>([])
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [billingFilter, setBillingFilter] = useState('')

  const { data: contracts = [] } = useQuery({ queryKey: ['contracts'], queryFn: () => api.get('/contracts').then(r => r.data) })
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) })
  const { data: products  = [] } = useQuery({ queryKey: ['products'],  queryFn: () => api.get('/products').then(r => r.data) })

  // Populate form when editing
  useEffect(() => {
    if (editContract) {
      setForm({
        name:         editContract.name,
        description:  editContract.description || '',
        status:       editContract.status,
        companyId:    editContract.companyId,
        value:        String(editContract.value),
        startDate:    editContract.startDate ? editContract.startDate.split('T')[0] : '',
        endDate:      editContract.endDate   ? editContract.endDate.split('T')[0]   : '',
        billingCycle: editContract.billingCycle || 'Monthly',
      })
      setItems((editContract.items || []).map((i: any) => ({
        productId:   i.productId || '',
        description: i.description,
        quantity:    i.quantity,
        unitPrice:   i.unitPrice,
        total:       i.total,
      })))
      setShowModal(true)
    }
  }, [editContract])

  const closeModal = () => { setShowModal(false); setEditContract(null); setForm({ ...emptyForm }); setItems([]) }

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/contracts', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); closeModal() },
    onError: (e: any) => alert(e?.response?.data?.message || 'Failed to save'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/contracts/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); closeModal() },
    onError: (e: any) => alert(e?.response?.data?.message || 'Failed to save'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/contracts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  })
  const signMutation = useMutation({
    mutationFn: (id: string) => api.put(`/contracts/${id}`, { signedAt: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  })
  const generateInvoiceMutation = useMutation({
    mutationFn: (id: string) => api.post(`/contracts/${id}/generate-invoice`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts'] }); qc.invalidateQueries({ queryKey: ['invoices'] }); alert('Invoice created as Draft') },
    onError: (e: any) => alert(e?.response?.data?.message || 'Failed to generate invoice'),
  })

  // Items helpers
  const addItem = (productId?: string) => {
    if (productId) {
      const p = (products as any[]).find((x: any) => x.id === productId)
      if (p) {
        setItems(prev => [...prev, { productId: p.id, description: p.name, quantity: 1, unitPrice: p.price || 0, total: p.price || 0 }])
        return
      }
    }
    setItems(prev => [...prev, emptyItem()])
  }
  const updateItem = (idx: number, field: keyof Item, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unitPrice') {
        updated.total = Number(updated.quantity) * Number(updated.unitPrice)
      }
      return updated
    }))
  }
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

  const itemsTotal    = items.reduce((s, i) => s + (Number(i.total) || 0), 0)
  const displayValue  = items.length > 0 ? itemsTotal : (Number(form.value) || 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...form,
      value: displayValue,
      items: items.map(i => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), total: Number(i.total) })),
    }
    if (editContract) {
      updateMutation.mutate({ id: editContract.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const activeContracts = (contracts as any[]).filter((c: any) => c.status === 'ACTIVE')
  const totalValue      = activeContracts.reduce((s: number, c: any) => s + c.value, 0)
  const expiringSoon    = activeContracts.filter((c: any) => new Date(c.endDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length

  const filtered = (contracts as any[]).filter((c: any) =>
    (!search        || c.name.toLowerCase().includes(search.toLowerCase()) || c.company?.name?.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter  || c.status === statusFilter) &&
    (!billingFilter || c.billingCycle === billingFilter)
  )

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contracts</h1>
          <p className="text-sm text-slate-500">{(contracts as any[]).length} contracts</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Contract
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Active Contracts</p>
          <p className="text-2xl font-bold text-green-600">{activeContracts.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Total Active Value</p>
          <p className="text-2xl font-bold text-slate-900">{fmt(totalValue)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Expiring Soon</p>
          <p className="text-2xl font-bold text-orange-500">{expiringSoon}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="input pl-9 text-sm w-full" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input text-sm w-auto">
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select value={billingFilter} onChange={e => setBillingFilter(e.target.value)} className="input text-sm w-auto">
          <option value="">All billing cycles</option>
          {BILLING_CYCLES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Contract</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Company</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Value</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Billing</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Period</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Next Invoice</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Signed</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Status</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c: any) => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4">
                  <p className="text-sm font-medium text-slate-800">{c.name}</p>
                  {c.description && <p className="text-xs text-slate-400 truncate max-w-[180px]">{c.description}</p>}
                  {c.items?.length > 0 && <p className="text-xs text-slate-400">{c.items.length} line item{c.items.length !== 1 ? 's' : ''}</p>}
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{c.company?.name}</td>
                <td className="py-3 px-4 text-sm font-medium text-slate-800">{fmt(c.value)}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{c.billingCycle || '—'}</td>
                <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                  {format(new Date(c.startDate), 'dd MMM yy')} → {format(new Date(c.endDate), 'dd MMM yy')}
                </td>
                <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                  {c.nextInvoiceDate
                    ? <span className={clsx(new Date(c.nextInvoiceDate) <= new Date() ? 'text-amber-600 font-medium' : '')}>
                        {format(new Date(c.nextInvoiceDate), 'dd MMM yyyy')}
                      </span>
                    : '—'}
                </td>
                <td className="py-3 px-4">
                  {c.signedAt
                    ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={11} /> Signed
                      </span>
                    : <button onClick={() => signMutation.mutate(c.id)} className="text-xs text-slate-400 hover:text-primary-600 transition-colors flex items-center gap-1">
                        <PenLine size={11} /> Sign
                      </button>}
                </td>
                <td className="py-3 px-4">
                  <span className={clsx('badge text-xs', statusColors[c.status])}>{c.status}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1 justify-end">
                    {c.status === 'ACTIVE' && c.billingCycle !== 'One-time' && (
                      <button
                        onClick={() => { if (window.confirm(`Generate invoice from "${c.name}"?`)) generateInvoiceMutation.mutate(c.id) }}
                        title="Generate Invoice"
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <FileCheck2 size={14} />
                      </button>
                    )}
                    <button onClick={() => setEditContract(c)} title="Edit" className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                      <PenLine size={14} />
                    </button>
                    <button
                      onClick={() => { if (window.confirm(`Delete "${c.name}"?`)) deleteMutation.mutate(c.id) }}
                      title="Delete"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-30" />
                  {(contracts as any[]).length === 0 ? 'No contracts yet' : 'No contracts match your filters'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      <Modal open={showModal} onClose={closeModal} title={editContract ? 'Edit Contract' : 'New Contract'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Contract Name</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea className="input h-16 resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">Company</label>
              <SearchableSelect
                value={form.companyId}
                onChange={val => setForm(f => ({ ...f, companyId: val }))}
                options={(companies as any[]).map((c: any) => ({ value: c.id, label: c.name }))}
                placeholder="Select company"
                emptyLabel="None"
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Billing Cycle</label>
              <select className="input" value={form.billingCycle} onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value }))}>
                {BILLING_CYCLES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Line Items</label>
              <div className="flex gap-2">
                <SearchableSelect
                  value=""
                  onChange={val => { if (val === '__manual') { addItem(); } else if (val) { addItem(val) } }}
                  options={[
                    { value: '__manual', label: '+ Add manual line' },
                    ...(products as any[]).filter((p: any) => p.isActive).map((p: any) => ({
                      value: p.id,
                      label: `${p.name}${p.sku ? ` · ${p.sku}` : ''}${p.price != null ? ` · ${symbol}${p.price}` : ''}`,
                    })),
                  ]}
                  placeholder="Add from product catalogue…"
                  emptyLabel="No products"
                  className="text-sm w-64"
                />
              </div>
            </div>

            {items.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden mb-2">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="text-left py-2 px-3">Description</th>
                      <th className="text-right py-2 px-3 w-20">Qty</th>
                      <th className="text-right py-2 px-3 w-28">Unit Price</th>
                      <th className="text-right py-2 px-3 w-28">Total</th>
                      <th className="py-2 px-3 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="py-1.5 px-3">
                          <input
                            className="input py-1 text-sm"
                            value={item.description}
                            onChange={e => updateItem(idx, 'description', e.target.value)}
                            placeholder="Description"
                            required
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <input
                            type="number" min="0" step="0.01"
                            className="input py-1 text-sm text-right"
                            value={item.quantity}
                            onChange={e => updateItem(idx, 'quantity', e.target.value)}
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{symbol}</span>
                            <input
                              type="number" min="0" step="0.01"
                              className="input py-1 text-sm text-right pl-6"
                              value={item.unitPrice}
                              onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                            />
                          </div>
                        </td>
                        <td className="py-1.5 px-3 text-right font-medium text-slate-700 whitespace-nowrap">
                          {fmt(Number(item.total))}
                        </td>
                        <td className="py-1.5 px-3">
                          <button type="button" onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {items.length === 0 && (
              <div>
                <label className="label">Value ({symbol}) <span className="text-slate-400 font-normal text-xs">— or add line items above to auto-calculate</span></label>
                <input
                  type="number" min="0" step="0.01"
                  className="input"
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  required={items.length === 0}
                />
              </div>
            )}

            {items.length > 0 && (
              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Total per billing period</p>
                  <p className="text-lg font-bold text-slate-900">{fmt(itemsTotal)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? 'Saving…' : editContract ? 'Save Changes' : 'Create Contract'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
