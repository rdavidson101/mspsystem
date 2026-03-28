import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Plus, Receipt, Search } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import Modal from '@/components/ui/Modal'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SENT: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-orange-100 text-orange-700',
}

export default function InvoicesPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ companyId: '', dueDate: '', notes: '', tax: '0', items: [{ description: '', quantity: '1', unitPrice: '', productId: '' }] })

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', statusFilter],
    queryFn: () => api.get('/invoices', { params: { status: statusFilter || undefined } }).then(r => r.data),
  })
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) })
  const { data: products = [] } = useQuery({ queryKey: ['products', 'active'], queryFn: () => api.get('/products', { params: { active: true } }).then(r => r.data) })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/invoices', data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      setShowModal(false)
      setForm({ companyId: '', dueDate: '', notes: '', tax: '0', items: [{ description: '', quantity: '1', unitPrice: '', productId: '' }] })
      navigate(`/invoices/${res.data.id}`)
    },
    onError: (err: any) => alert(err?.response?.data?.message || 'Failed to create invoice'),
  })

  function addItem() { setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: '1', unitPrice: '', productId: '' }] })) }
  function updateItem(i: number, field: string, val: string) {
    setForm(f => { const items = [...f.items]; items[i] = { ...items[i], [field]: val }; return { ...f, items } })
  }
  function pickProduct(i: number, productId: string) {
    const p = products.find((p: any) => p.id === productId)
    setForm(f => {
      const items = [...f.items]
      items[i] = { ...items[i], productId, description: p ? p.name : items[i].description, unitPrice: p?.price != null ? String(p.price) : items[i].unitPrice }
      return { ...f, items }
    })
  }

  const subtotal = form.items.reduce((s, item) => s + (Number(item.quantity) * Number(item.unitPrice) || 0), 0)
  const tax = Number(form.tax) || 0
  const total = subtotal + (subtotal * tax / 100)

  const totalPaid = invoices.filter((i: any) => i.status === 'PAID').reduce((s: number, i: any) => s + i.total, 0)
  const totalPending = invoices.filter((i: any) => ['SENT', 'OVERDUE'].includes(i.status)).reduce((s: number, i: any) => s + i.total, 0)

  const filteredInvoices = invoices.filter((invoice: any) =>
    (!search || invoice.number.toString().includes(search) || invoice.company?.name?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500">{invoices.length} invoices</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Invoice
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4"><p className="text-xs text-slate-500 mb-1">Total Paid</p><p className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500 mb-1">Pending</p><p className="text-2xl font-bold text-orange-500">${totalPending.toLocaleString()}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500 mb-1">Overdue</p><p className="text-2xl font-bold text-red-500">{invoices.filter((i: any) => i.status === 'OVERDUE').length}</p></div>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="input pl-9 text-sm w-full" />
        </div>
      </div>

      <div className="flex gap-2">
        {['', 'DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
            {s === '' ? 'All' : s}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Invoice #</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Company</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Issue Date</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Due Date</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Total</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((invoice: any) => (
              <tr
                key={invoice.id}
                onClick={() => navigate(`/invoices/${invoice.id}`)}
                className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
              >
                <td className="py-3 px-4 text-sm font-mono font-medium text-primary-600">{invoice.number}</td>
                <td className="py-3 px-4 text-sm text-slate-700">{invoice.company?.name}</td>
                <td className="py-3 px-4 text-xs text-slate-500">{format(new Date(invoice.issueDate), 'MMM d, yyyy')}</td>
                <td className="py-3 px-4 text-xs text-slate-500">{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</td>
                <td className="py-3 px-4 text-sm font-semibold text-slate-900">£{invoice.total.toLocaleString()}</td>
                <td className="py-3 px-4">
                  <span className={clsx('badge text-xs', statusColors[invoice.status])}>{invoice.status}</span>
                </td>
              </tr>
            ))}
            {filteredInvoices.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-slate-400"><Receipt size={32} className="mx-auto mb-2 opacity-30" />{invoices.length === 0 ? 'No invoices yet' : 'No invoices match your search'}</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Invoice" size="lg">
        <form onSubmit={e => {
          e.preventDefault()
          if (!form.companyId) { alert('Please select a company'); return }
          if (!form.dueDate) { alert('Please set a due date'); return }
          createMutation.mutate({
            companyId: form.companyId,
            dueDate: form.dueDate,
            notes: form.notes || null,
            subtotal,
            tax: subtotal * tax / 100,
            total,
            items: form.items.map(i => ({
              description: i.description,
              quantity: Number(i.quantity),
              unitPrice: Number(i.unitPrice),
              total: Number(i.quantity) * Number(i.unitPrice),
              productId: i.productId || null,
            })),
          })
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Company</label>
              <SearchableSelect
                value={form.companyId}
                onChange={val => setForm(f => ({ ...f, companyId: val }))}
                options={companies.map((c: any) => ({ value: c.id, label: c.name }))}
                placeholder="Select company"
                emptyLabel="None"
              />
            </div>
            <div><label className="label">Due Date</label><input type="date" className="input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} required /></div>
          </div>
          <div>
            <label className="label">Line Items</label>
            <div className="space-y-3">
              {form.items.map((item, i) => (
                <div key={i} className="space-y-1.5 p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        value={item.productId}
                        onChange={val => pickProduct(i, val)}
                        options={[{ value: '', label: '— Manual entry —' }, ...products.map((p: any) => ({ value: p.id, label: `${p.name}${p.sku ? ` · ${p.sku}` : ''}${p.price != null ? ` · £${p.price}` : ''}` }))]}
                        placeholder="Pick from catalog…"
                        emptyLabel=""
                      />
                    </div>
                    <button type="button" onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))} className="text-red-400 hover:text-red-600 font-bold p-1">×</button>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <input className="input col-span-6 text-sm" placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                    <input type="number" className="input col-span-2 text-sm" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                    <input type="number" className="input col-span-4 text-sm" placeholder="Unit price" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)} />
                  </div>
                </div>
              ))}
              <button type="button" onClick={addItem} className="text-xs text-primary-600 hover:text-primary-700 font-medium">+ Add line item</button>
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <div className="text-right space-y-1">
              <p className="text-xs text-slate-500">Subtotal: <span className="font-semibold text-slate-800">${subtotal.toFixed(2)}</span></p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs text-slate-500">Tax %:</span>
                <input type="number" className="input w-16 text-xs py-1" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))} />
              </div>
              <p className="text-sm font-bold text-slate-900">Total: ${total.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Invoice'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
