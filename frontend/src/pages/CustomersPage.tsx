import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Link } from 'react-router-dom'
import { Plus, Search, Building2, Globe, Phone, Mail } from 'lucide-react'
import Modal from '@/components/ui/Modal'

export default function CustomersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', industry: '', phone: '', email: '', website: '', city: '', state: '', country: 'USA' })

  const { data: companies = [] } = useQuery({
    queryKey: ['companies', search],
    queryFn: () => api.get('/companies', { params: { search: search || undefined } }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/companies', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); setShowModal(false); setForm({ name: '', industry: '', phone: '', email: '', website: '', city: '', state: '', country: 'USA' }) },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">{companies.length} companies</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Customer
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 max-w-sm">
        <Search size={15} className="text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="text-sm outline-none flex-1" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {companies.map((company: any) => (
          <div key={company.id} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 size={20} className="text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">{company.name}</h3>
                {company.industry && <p className="text-xs text-slate-500">{company.industry}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              {company.phone && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Phone size={12} className="text-slate-400" />
                  {company.phone}
                </div>
              )}
              {company.email && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Mail size={12} className="text-slate-400" />
                  {company.email}
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Globe size={12} className="text-slate-400" />
                  {company.website}
                </div>
              )}
              {(company.city || company.country) && (
                <p className="text-xs text-slate-400">{[company.city, company.state, company.country].filter(Boolean).join(', ')}</p>
              )}
            </div>
            <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">{company._count?.contacts || 0}</p>
                <p className="text-xs text-slate-400">Contacts</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">{company._count?.tickets || 0}</p>
                <p className="text-xs text-slate-400">Tickets</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">{company._count?.projects || 0}</p>
                <p className="text-xs text-slate-400">Projects</p>
              </div>
            </div>
          </div>
        ))}
        {companies.length === 0 && (
          <div className="col-span-3 card p-12 text-center text-slate-400">
            <Building2 size={40} className="mx-auto mb-2 opacity-30" />
            No customers yet
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Customer">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form) }} className="space-y-4">
          <div><label className="label">Company Name</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Industry</label><input className="input" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="label">Website</label><input className="input" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">City</label><input className="input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div><label className="label">State</label><input className="input" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} /></div>
            <div><label className="label">Country</label><input className="input" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Add Customer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
