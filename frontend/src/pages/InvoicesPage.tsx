import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, Receipt } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import Modal from '@/components/ui/Modal'

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SENT: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-orange-100 text-orange-700',
}

export default function InvoicesPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ companyId: '', dueDate: '', notes: '', tax: '0', items: [{ description: '', quantity: '1', unitPrice: '' }] })

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', statusFilter],
    queryFn: () => api.get('/invoices', { params: { status: statusFilter || undefined } }).then(r => r.data),
  })
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/invoices', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); setShowModal(false) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/invoices/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })

  function addItem() { setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: '1', unitPrice: '' }] })) }
  function updateItem(i: number, field: string, val: string) {
    setForm(f => { const items = [...f.items]; items[i] = { ...items[i], [field]: val }; return { ...f, items } })
  }

  const subtotal = form.items.reduce((s, item) => s + (Number(item.quantity) * Number(item.unitPrice) || 0), 0)
  const tax = Number(form.tax) || 0
  const total = subtotal + (subtotal * tax / 100)

  const totalPaid = invoices.filter((i: any) => i.status === 'PAID').reduce((s: number, i: any) => s + i.total, 0)
  const totalPending = invoices.filter((i: any) => ['SENT', 'OVERDUE'].includes(i.status)).reduce((s: number, i: any) => s + i.total, 0)

  return (
    <div className="space-y-6">
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
            {invoices.map((invoice: any) => (
              <tr key={invoice.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-sm font-mono font-medium text-primary-600">{invoice.number}</td>
                <td className="py-3 px-4 text-sm text-slate-700">{invoice.company?.name}</td>
                <td className="py-3 px-4 text-xs text-slate-500">{format(new Date(invoice.issueDate), 'MMM d, yyyy')}</td>
                <td className="py-3 px-4 text-xs text-slate-500">{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</td>
                <td className="py-3 px-4 text-sm font-semibold text-slate-900">${invoice.total.toLocaleString()}</td>
                <td className="py-3 px-4">
                  <select value={invoice.status} onChange={e => updateMutation.mutate({ id: invoice.id, status: e.target.value })} className={clsx('badge text-xs border-0 cursor-pointer', statusColors[invoice.status])}>
                    <option value="DRAFT">Draft</option>
                    <option value="SENT">Sent</option>
                    <option value="PAID">Paid</option>
                    <option value="OVERDUE">Overdue</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-slate-400"><Receipt size={32} className="mx-auto mb-2 opacity-30" />No invoices yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Invoice" size="lg">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ companyId: form.companyId, dueDate: form.dueDate, notes: form.notes, subtotal, tax: subtotal * tax / 100, total, items: form.items.map(i => ({ description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), total: Number(i.quantity) * Number(i.unitPrice) })) }) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Company</label><select className="input" value={form.companyId} onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))} required><option value="">Select company</option>{companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="label">Due Date</label><input type="date" className="input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} required /></div>
          </div>
          <div>
            <label className="label">Line Items</label>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-1">
                <span className="col-span-6">Description</span>
                <span className="col-span-2">Qty</span>
                <span className="col-span-3">Unit Price</span>
                <span className="col-span-1"></span>
              </div>
              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <input className="input col-span-6" placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                  <input type="number" className="input col-span-2" placeholder="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                  <input type="number" className="input col-span-3" placeholder="0.00" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)} />
                  <button type="button" onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))} className="col-span-1 text-red-400 hover:text-red-600 text-lg font-bold">×</button>
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
