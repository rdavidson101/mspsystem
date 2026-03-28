import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useCurrency } from '@/lib/useCurrency'
import { Plus, Receipt } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import Modal from '@/components/ui/Modal'

const categories = ['SOFTWARE', 'HARDWARE', 'TRAVEL', 'SERVICES', 'UTILITIES', 'OTHER']
const categoryColors: Record<string, string> = {
  SOFTWARE: 'bg-blue-100 text-blue-700',
  HARDWARE: 'bg-purple-100 text-purple-700',
  TRAVEL: 'bg-orange-100 text-orange-700',
  SERVICES: 'bg-teal-100 text-teal-700',
  UTILITIES: 'bg-yellow-100 text-yellow-700',
  OTHER: 'bg-slate-100 text-slate-600',
}

export default function ExpensesPage() {
  const qc = useQueryClient()
  const { fmt } = useCurrency()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', amount: '', category: 'OTHER', description: '', date: new Date().toISOString().split('T')[0] })

  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => api.get('/expenses').then(r => r.data) })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/expenses', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setShowModal(false) },
  })

  const total = expenses.reduce((s: number, e: any) => s + e.amount, 0)
  const byCategory = categories.reduce((acc: Record<string, number>, cat) => {
    acc[cat] = expenses.filter((e: any) => e.category === cat).reduce((s: number, e: any) => s + e.amount, 0)
    return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          <p className="text-sm text-slate-500">{expenses.length} expenses</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Expense
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4 col-span-1"><p className="text-xs text-slate-500 mb-1">Total Expenses</p><p className="text-2xl font-bold text-slate-900">{fmt(total)}</p></div>
        {Object.entries(byCategory).filter(([, v]) => v > 0).slice(0, 3).map(([cat, val]) => (
          <div key={cat} className="card p-4"><p className="text-xs text-slate-500 mb-1">{cat}</p><p className="text-2xl font-bold text-slate-900">{fmt(val as number)}</p></div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Title</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Category</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Amount</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Date</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Description</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense: any) => (
              <tr key={expense.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-sm font-medium text-slate-800">{expense.title}</td>
                <td className="py-3 px-4"><span className={clsx('badge text-xs', categoryColors[expense.category])}>{expense.category}</span></td>
                <td className="py-3 px-4 text-sm font-semibold text-slate-900">{fmt(expense.amount)}</td>
                <td className="py-3 px-4 text-xs text-slate-500">{format(new Date(expense.date), 'MMM d, yyyy')}</td>
                <td className="py-3 px-4 text-sm text-slate-500">{expense.description || '—'}</td>
              </tr>
            ))}
            {expenses.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-slate-400"><Receipt size={32} className="mx-auto mb-2 opacity-30" />No expenses yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Expense">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ ...form, amount: Number(form.amount) }) }} className="space-y-4">
          <div><label className="label">Title</label><input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Amount ($)</label><input type="number" step="0.01" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required /></div>
            <div><label className="label">Category</label><select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required /></div>
          <div><label className="label">Description</label><textarea className="input h-16 resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Add Expense'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
