import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCurrency } from '@/lib/useCurrency'
import { format } from 'date-fns'
import { ArrowLeft, Edit2, Save, Trash2, CheckCircle, Plus, X } from 'lucide-react'
import clsx from 'clsx'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SENT: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-orange-100 text-orange-700',
}

interface LineItem {
  id?: string
  description: string
  quantity: string
  unitPrice: string
  productId?: string
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { symbol, fmt, fmtFixed } = useCurrency()
  const [editing, setEditing] = useState(false)
  const [items, setItems] = useState<LineItem[]>([])
  const [form, setForm] = useState({ dueDate: '', notes: '', taxRate: '0', status: '' })

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get(`/invoices/${id}`).then(r => r.data),
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'active'],
    queryFn: () => api.get('/products', { params: { active: true } }).then(r => r.data),
  })

  useEffect(() => {
    if (invoice && !editing) {
      const computedTaxRate = invoice.subtotal > 0 ? Math.round((invoice.tax / invoice.subtotal) * 100) : 0
      setForm({
        dueDate: invoice.dueDate ? format(new Date(invoice.dueDate), 'yyyy-MM-dd') : '',
        notes: invoice.notes || '',
        taxRate: String(computedTaxRate),
        status: invoice.status,
      })
      setItems((invoice.items || []).map((i: any) => ({
        id: i.id,
        description: i.description,
        quantity: String(i.quantity),
        unitPrice: String(i.unitPrice),
        productId: i.productId || undefined,
      })))
    }
  }, [invoice, editing])

  const subtotal = items.reduce((s, item) => s + (Number(item.quantity) * Number(item.unitPrice) || 0), 0)
  const taxRate = Number(form.taxRate) || 0
  const taxAmount = subtotal * taxRate / 100
  const total = subtotal + taxAmount

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/invoices/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', id] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      setEditing(false)
    },
    onError: (err: any) => alert(err?.response?.data?.message || 'Failed to save'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/invoices/${id}`),
    onSuccess: () => navigate('/invoices'),
  })

  function handleSave() {
    updateMutation.mutate({
      dueDate: form.dueDate,
      notes: form.notes || null,
      subtotal,
      tax: taxAmount,
      total,
      status: form.status,
      items: items.map(i => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        total: Number(i.quantity) * Number(i.unitPrice),
        productId: i.productId || null,
      })),
    })
  }

  function markPaid() {
    updateMutation.mutate({ status: 'PAID' })
  }

  function pickProduct(idx: number, productId: string) {
    if (!productId) {
      setItems(prev => prev.map((item, i) => i === idx ? { ...item, productId: undefined } : item))
      return
    }
    const p = products.find((p: any) => p.id === productId)
    if (!p) return
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, description: p.name, unitPrice: String(p.price ?? ''), productId: p.id } : item
    ))
  }

  function addItem() { setItems(prev => [...prev, { description: '', quantity: '1', unitPrice: '' }]) }
  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)) }
  function updateItem(idx: number, field: string, val: string) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item))
  }

  if (isLoading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading…</div>
  if (!invoice) return <div className="flex items-center justify-center h-64 text-slate-400">Invoice not found</div>

  const displayItems = editing ? items : (invoice.items || [])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/invoices')} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 font-mono">{invoice.number}</h1>
              <span className={clsx('badge', statusColors[invoice.status])}>{invoice.status}</span>
            </div>
            <p className="text-sm text-slate-500">{invoice.company?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
            <button
              onClick={markPaid}
              disabled={updateMutation.isPending}
              className="btn-primary flex items-center gap-2 !bg-green-600 hover:!bg-green-700"
            >
              <CheckCircle size={16} /> Mark as Paid
            </button>
          )}
          {!editing ? (
            <>
              <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2">
                <Edit2 size={15} /> Edit
              </button>
              <button
                onClick={() => { if (window.confirm('Permanently delete this invoice?')) deleteMutation.mutate() }}
                className="btn-secondary !text-red-600 hover:!bg-red-50"
              >
                <Trash2 size={15} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={updateMutation.isPending} className="btn-primary flex items-center gap-2">
                <Save size={15} /> {updateMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Subtotal</p>
          <p className="text-xl font-bold text-slate-900">{fmtFixed(editing ? subtotal : invoice.subtotal)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Tax</p>
          <p className="text-xl font-bold text-slate-900">{fmtFixed(editing ? taxAmount : invoice.tax)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Total</p>
          <p className="text-xl font-bold text-primary-600">{fmtFixed(editing ? total : invoice.total)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Line Items</p>
          <p className="text-xl font-bold text-slate-900">{editing ? items.length : (invoice.items?.length || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Invoice details */}
        <div className="space-y-4">
          <div className="card p-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Details</h3>
            <div>
              <p className="label">Company</p>
              <p className="text-sm font-medium text-slate-800">{invoice.company?.name}</p>
            </div>
            <div>
              <p className="label">Issue Date</p>
              <p className="text-sm text-slate-800">{format(new Date(invoice.issueDate), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="label">Due Date</p>
              {editing ? (
                <input type="date" className="input text-sm" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              ) : (
                <p className="text-sm text-slate-800">{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</p>
              )}
            </div>
            <div>
              <p className="label">Status</p>
              {editing ? (
                <select className="input text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              ) : (
                <span className={clsx('badge text-xs', statusColors[invoice.status])}>{invoice.status}</span>
              )}
            </div>
            {editing && (
              <div>
                <p className="label">Tax Rate (%)</p>
                <input type="number" min="0" className="input text-sm w-24" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))} />
              </div>
            )}
          </div>

          <div className="card p-4">
            <p className="label mb-2">Notes</p>
            {editing ? (
              <textarea
                className="input text-sm w-full"
                rows={4}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Invoice notes…"
              />
            ) : invoice.notes ? (
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">No notes</p>
            )}
          </div>
        </div>

        {/* Right: Line items */}
        <div className="col-span-2 card overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Line Items</h3>
            {editing && (
              <button onClick={addItem} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                <Plus size={13} /> Add item
              </button>
            )}
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="py-2 px-3 text-left text-xs font-medium text-slate-500">Description</th>
                  <th className="py-2 px-3 text-right text-xs font-medium text-slate-500 w-16">Qty</th>
                  <th className="py-2 px-3 text-right text-xs font-medium text-slate-500 w-28">Unit Price</th>
                  <th className="py-2 px-3 text-right text-xs font-medium text-slate-500 w-24">Total</th>
                  {editing && <th className="w-8"></th>}
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 px-3">
                      {editing ? (
                        <div className="space-y-1.5">
                          <SearchableSelect
                            value={item.productId || ''}
                            onChange={val => pickProduct(idx, val)}
                            options={[
                              { value: '', label: '— Manual entry —' },
                              ...products.map((p: any) => ({ value: p.id, label: `${p.name}${p.sku ? ` · ${p.sku}` : ''}${p.price != null ? ` · ${symbol}${p.price}` : ''}` })),
                            ]}
                            placeholder="Pick from catalog…"
                            emptyLabel=""
                          />
                          <input
                            className="input text-sm w-full"
                            value={item.description}
                            onChange={e => updateItem(idx, 'description', e.target.value)}
                            placeholder="Description"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-slate-800">{item.description}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right align-top">
                      {editing ? (
                        <input
                          type="number"
                          min="0"
                          className="input text-sm text-right w-16"
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', e.target.value)}
                        />
                      ) : (
                        <span className="text-sm text-slate-700">{item.quantity}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right align-top">
                      {editing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input text-sm text-right w-28"
                          value={item.unitPrice}
                          onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                        />
                      ) : (
                        <span className="text-sm text-slate-700">{fmtFixed(Number(item.unitPrice))}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right align-top">
                      <span className="text-sm font-medium text-slate-900">
                        {fmtFixed(Number(item.quantity) * Number(item.unitPrice))}
                      </span>
                    </td>
                    {editing && (
                      <td className="py-2 px-2 align-top">
                        <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1 mt-0.5">
                          <X size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {displayItems.length === 0 && (
                  <tr>
                    <td colSpan={editing ? 5 : 4} className="py-10 text-center text-sm text-slate-400">
                      No line items — click Edit to add some
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={editing ? 3 : 3} className="py-2 px-3 text-right text-xs text-slate-500">Subtotal</td>
                  <td className="py-2 px-3 text-right text-sm font-medium text-slate-800">
                    {fmtFixed(editing ? subtotal : invoice.subtotal)}
                  </td>
                  {editing && <td />}
                </tr>
                <tr>
                  <td colSpan={3} className="py-2 px-3 text-right text-xs text-slate-500">
                    Tax{editing ? ` (${form.taxRate}%)` : ''}
                  </td>
                  <td className="py-2 px-3 text-right text-sm font-medium text-slate-800">
                    {fmtFixed(editing ? taxAmount : invoice.tax)}
                  </td>
                  {editing && <td />}
                </tr>
                <tr className="border-t border-slate-200">
                  <td colSpan={3} className="py-3 px-3 text-right text-sm font-bold text-slate-900">Total</td>
                  <td className="py-3 px-3 text-right text-base font-bold text-primary-600">
                    {fmtFixed(editing ? total : invoice.total)}
                  </td>
                  {editing && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
