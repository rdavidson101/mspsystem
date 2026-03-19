import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Plus, Search, Building2, Phone, Mail, Globe, MapPin,
  Pencil, Trash2, X, Users, Ticket, FolderKanban, Star,
  PowerOff, Power, ChevronLeft, ChevronRight
} from 'lucide-react'
import clsx from 'clsx'
import UserAvatar from '@/components/ui/UserAvatar'

const PAGE_SIZE = 9

const EMPTY_FORM = {
  name: '', industry: '', phone: '', email: '',
  website: '', address: '', city: '', country: '', notes: '',
  accountManagerId: '',
}

function CustomerModal({ initial, onClose, onSave, title, users }: {
  initial: typeof EMPTY_FORM & { id?: string }
  onClose: () => void
  onSave: (data: any) => void
  title: string
  users: any[]
}) {
  const [form, setForm] = useState(initial)
  const f = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Company Name *</label>
            <input autoFocus className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100" value={form.name} onChange={f('name')} placeholder="Acme Ltd" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Industry</label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100" value={form.industry} onChange={f('industry')} placeholder="Technology" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Phone</label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100" value={form.phone} onChange={f('phone')} placeholder="+44 7700 900000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Email</label>
              <input type="email" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100" value={form.email} onChange={f('email')} placeholder="hello@acme.com" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Website</label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100" value={form.website} onChange={f('website')} placeholder="https://acme.com" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Address</label>
            <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100" value={form.address} onChange={f('address')} placeholder="123 Main Street" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">City</label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100" value={form.city} onChange={f('city')} placeholder="London" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Country</label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100" value={form.country} onChange={f('country')} placeholder="UK" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Notes</label>
            <textarea rows={3} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 resize-none" value={form.notes} onChange={f('notes')} placeholder="Any additional notes…" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Account Manager</label>
            <select
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-white"
              value={form.accountManagerId || ''}
              onChange={f('accountManagerId')}
            >
              <option value="">None</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">Cancel</button>
          <button onClick={() => { if (form.name.trim()) onSave(form) }} disabled={!form.name.trim()} className="btn-primary text-sm px-5 py-2 disabled:opacity-50">Save</button>
        </div>
      </div>
    </div>
  )
}

type StatusFilter = 'all' | 'active' | 'disabled'

export default function CustomersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [page, setPage] = useState(0)

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  })

  const { data: internalUsers = [] } = useQuery({
    queryKey: ['users', 'INTERNAL'],
    queryFn: () => api.get('/users', { params: { type: 'INTERNAL' } }).then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (data: any) => api.post('/companies', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); setShowCreate(false) },
  })
  const updateMut = useMutation({
    mutationFn: (data: any) => api.patch(`/companies/${data.id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); setEditing(null) },
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/companies/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  })
  const toggleMut = useMutation({
    mutationFn: (company: any) => api.patch(`/companies/${company.id}`, { isActive: !company.isActive }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  })

  const filtered = companies
    .filter((c: any) => statusFilter === 'all' ? true : statusFilter === 'active' ? c.isActive !== false : c.isActive === false)
    .filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()))

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(0)
  }

  const handleStatusFilter = (val: StatusFilter) => {
    setStatusFilter(val)
    setPage(0)
  }

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'active', label: 'Active' },
    { key: 'disabled', label: 'Disabled' },
    { key: 'all', label: 'All' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">{filtered.length} {filtered.length === 1 ? 'customer' : 'customers'}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 max-w-sm shadow-sm">
        <Search size={15} className="text-slate-400 flex-shrink-0" />
        <input
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Search customers…"
          className="text-sm outline-none flex-1 text-slate-700 placeholder-slate-400"
        />
        {search && <button onClick={() => handleSearchChange('')} className="text-slate-300 hover:text-slate-500"><X size={13} /></button>}
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {statusTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleStatusFilter(tab.key)}
            className={clsx(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              statusFilter === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Building2 size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No customers found</p>
          {search && <p className="text-sm mt-1">Try a different search term</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginated.map((company: any) => {
            const isDisabled = company.isActive === false
            return (
              <div
                key={company.id}
                className={clsx(
                  'rounded-2xl border shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-4',
                  isDisabled
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : company.isInternal
                      ? 'bg-amber-50/30 border-amber-200 bg-white'
                      : 'bg-white border-slate-200'
                )}
              >
                {/* Card header */}
                <div className="flex items-start gap-3">
                  <div className={clsx(
                    'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                    isDisabled ? 'bg-slate-200' : company.isInternal ? 'bg-amber-100' : 'bg-primary-50'
                  )}>
                    <Building2 size={20} className={isDisabled ? 'text-slate-400' : company.isInternal ? 'text-amber-600' : 'text-primary-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 truncate">{company.name}</h3>
                      {company.isInternal && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 flex-shrink-0">
                          <Star size={9} fill="currentColor" /> MSP
                        </span>
                      )}
                      {isDisabled && (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 border border-slate-300 flex-shrink-0">
                          Disabled
                        </span>
                      )}
                    </div>
                    {company.industry && <p className="text-xs text-slate-500 mt-0.5">{company.industry}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditing({ ...company, accountManagerId: company.accountManagerId || '' })}
                      className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    {!company.isInternal && (
                      <>
                        <button
                          onClick={() => toggleMut.mutate(company)}
                          className={clsx(
                            'p-1.5 rounded-lg transition-colors',
                            isDisabled
                              ? 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                              : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                          )}
                          title={isDisabled ? 'Enable customer' : 'Disable customer'}
                        >
                          {isDisabled ? <Power size={14} /> : <PowerOff size={14} />}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${company.name}? This will permanently remove all associated tickets, projects, contacts and more.`)) {
                              deleteMut.mutate(company.id)
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Contact info */}
                {(company.phone || company.email || company.website || company.city) && (
                  <div className="space-y-1.5">
                    {company.phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Phone size={11} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{company.phone}</span>
                      </div>
                    )}
                    {company.email && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Mail size={11} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{company.email}</span>
                      </div>
                    )}
                    {company.website && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Globe size={11} className="text-slate-400 flex-shrink-0" />
                        <a href={company.website} target="_blank" rel="noopener noreferrer" className="truncate hover:text-primary-600">{company.website.replace(/^https?:\/\//, '')}</a>
                      </div>
                    )}
                    {(company.city || company.country) && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{[company.city, company.country].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Avatar stack for MSP companies */}
                {company.isInternal && company.users?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {company.users.slice(0, 5).map((u: any) => (
                        <UserAvatar key={u.id} user={u} size="xs" />
                      ))}
                      {(company._count?.users ?? 0) > 5 && (
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                          +{(company._count?.users ?? 0) - 5}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{company._count?.users ?? 0} team member{(company._count?.users ?? 0) !== 1 ? 's' : ''}</span>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 pt-1 border-t border-slate-100">
                  {company.isInternal ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Users size={12} className="text-slate-400" />
                      <span>{company._count?.users ?? 0} team members</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Users size={12} className="text-slate-400" />
                      <span>{company._count?.contacts ?? 0} contacts</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Ticket size={12} className="text-slate-400" />
                    <span>{company._count?.tickets ?? 0} tickets</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <FolderKanban size={12} className="text-slate-400" />
                    <span>{company._count?.projects ?? 0} projects</span>
                  </div>
                </div>

                {/* Account Manager */}
                {company.accountManager && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <UserAvatar user={company.accountManager} size="xs" />
                    <span className="text-xs text-slate-500">AM: {company.accountManager.firstName} {company.accountManager.lastName}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft size={15} /> Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg hover:bg-slate-100 transition-colors"
          >
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CustomerModal
          title="Add Customer"
          initial={EMPTY_FORM}
          onClose={() => setShowCreate(false)}
          onSave={data => createMut.mutate(data)}
          users={internalUsers}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <CustomerModal
          title="Edit Customer"
          initial={{ ...editing, accountManagerId: editing.accountManagerId || '' }}
          onClose={() => setEditing(null)}
          onSave={data => updateMut.mutate({ ...data, id: editing.id })}
          users={internalUsers}
        />
      )}
    </div>
  )
}
