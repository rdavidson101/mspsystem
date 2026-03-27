import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  ArrowLeft, Building2, Phone, Mail, Globe, MapPin, Pencil, Save, X,
  Users, Ticket, FileText, TrendingUp, Star, Power, PowerOff, Trash2,
  User, ShieldCheck
} from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import UserAvatar from '@/components/ui/UserAvatar'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

type Tab = 'contacts' | 'leads' | 'contracts' | 'invoices'

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SENT: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-400',
  ACTIVE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-red-100 text-red-700',
  NEW: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-amber-100 text-amber-700',
  QUALIFIED: 'bg-purple-100 text-purple-700',
  PROPOSAL: 'bg-cyan-100 text-cyan-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
}

export default function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('contacts')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>(null)

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: () => api.get(`/companies/${id}`).then(r => r.data),
    onSuccess: (data: any) => {
      if (!form) setForm(buildForm(data))
    },
  })

  const { data: internalUsers = [] } = useQuery({
    queryKey: ['users', 'INTERNAL'],
    queryFn: () => api.get('/users', { params: { type: 'INTERNAL' } }).then(r => r.data),
  })
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams').then(r => r.data),
  })

  const updateMut = useMutation({
    mutationFn: (data: any) => api.patch(`/companies/${id}`, data).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['company', id] })
      qc.invalidateQueries({ queryKey: ['companies'] })
      setForm(buildForm(data))
      setEditing(false)
    },
  })
  const toggleMut = useMutation({
    mutationFn: () => api.patch(`/companies/${id}`, { isActive: !company?.isActive }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['company', id] }); qc.invalidateQueries({ queryKey: ['companies'] }) },
  })
  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/companies/${id}`).then(r => r.data),
    onSuccess: () => navigate('/customers'),
  })

  function buildForm(data: any) {
    return {
      name: data.name || '',
      industry: data.industry || '',
      phone: data.phone || '',
      email: data.email || '',
      website: data.website || '',
      address: data.address || '',
      city: data.city || '',
      country: data.country || '',
      notes: data.notes || '',
      accountManagerId: data.accountManagerId || '',
      serviceTeamId: data.serviceTeamId || '',
      keyContactId: data.keyContactId || '',
    }
  }

  function Field({ label, k, type = 'text', rows }: { label: string; k: string; type?: string; rows?: number }) {
    if (!editing) return null
    return (
      <div>
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">{label}</label>
        {rows ? (
          <textarea
            rows={rows}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 resize-none"
            value={form[k] || ''}
            onChange={e => setForm((p: any) => ({ ...p, [k]: e.target.value }))}
          />
        ) : (
          <input
            type={type}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            value={form[k] || ''}
            onChange={e => setForm((p: any) => ({ ...p, [k]: e.target.value }))}
          />
        )}
      </div>
    )
  }

  function InfoRow({ icon: Icon, value, href }: { icon: any; value?: string | null; href?: string }) {
    if (!value) return null
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Icon size={14} className="text-slate-400 flex-shrink-0" />
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 truncate">{value}</a>
        ) : (
          <span className="truncate">{value}</span>
        )}
      </div>
    )
  }

  const tabs: { key: Tab; label: string; icon: any; count?: number }[] = [
    { key: 'contacts', label: 'Contacts', icon: Users, count: company?._count?.contacts },
    { key: 'leads', label: 'Leads', icon: TrendingUp, count: company?.leads?.length },
    { key: 'contracts', label: 'Contracts', icon: FileText, count: company?.contracts?.length },
    { key: 'invoices', label: 'Invoices', icon: FileText, count: company?.invoices?.length },
  ]

  if (isLoading || !company) return <div className="p-8 text-slate-400">Loading…</div>

  const isDisabled = company.isActive === false
  const currentForm = form || buildForm(company)

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/customers')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 mt-1 flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
            {company.isInternal && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                <Star size={9} fill="currentColor" /> MSP
              </span>
            )}
            {isDisabled && (
              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 border border-slate-300">
                Disabled
              </span>
            )}
          </div>
          {company.industry && <p className="text-sm text-slate-500 mt-0.5">{company.industry}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!company.isInternal && (
            <>
              <button
                onClick={() => toggleMut.mutate()}
                disabled={toggleMut.isPending}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isDisabled ? 'text-green-700 bg-green-50 hover:bg-green-100' : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                )}
              >
                {isDisabled ? <><Power size={14} /> Enable</> : <><PowerOff size={14} /> Disable</>}
              </button>
              <button
                onClick={() => { if (confirm(`Delete ${company.name}? This permanently removes all associated data.`)) deleteMut.mutate() }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <Trash2 size={14} /> Delete
              </button>
            </>
          )}
          {editing ? (
            <div className="flex gap-2">
              <button onClick={() => { setEditing(false); setForm(buildForm(company)) }} className="btn-secondary text-sm flex items-center gap-1.5"><X size={14} /> Cancel</button>
              <button
                onClick={() => updateMut.mutate(currentForm)}
                disabled={updateMut.isPending || !currentForm.name?.trim()}
                className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save size={14} /> {updateMut.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <button onClick={() => { setForm(buildForm(company)); setEditing(true) }} className="btn-secondary text-sm flex items-center gap-1.5">
              <Pencil size={14} /> Edit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left: Company info */}
        <div className="col-span-1 space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Company Info</h3>
            {editing ? (
              <div className="space-y-3">
                <Field label="Company Name *" k="name" />
                <Field label="Industry" k="industry" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone" k="phone" />
                  <Field label="Email" k="email" />
                </div>
                <Field label="Website" k="website" />
                <Field label="Address" k="address" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City" k="city" />
                  <Field label="Country" k="country" />
                </div>
                <Field label="Notes" k="notes" rows={3} />
              </div>
            ) : (
              <div className="space-y-2">
                <InfoRow icon={Phone} value={company.phone} />
                <InfoRow icon={Mail} value={company.email} href={company.email ? `mailto:${company.email}` : undefined} />
                <InfoRow icon={Globe} value={company.website?.replace(/^https?:\/\//, '')} href={company.website} />
                <InfoRow icon={MapPin} value={[company.city, company.country].filter(Boolean).join(', ')} />
                {company.notes && (
                  <p className="text-sm text-slate-500 mt-2 pt-2 border-t border-slate-100 whitespace-pre-wrap">{company.notes}</p>
                )}
                {!company.phone && !company.email && !company.website && !company.city && !company.notes && (
                  <p className="text-sm text-slate-400 italic">No contact details</p>
                )}
              </div>
            )}
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Management</h3>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">Account Manager</label>
                  <SearchableSelect
                    value={currentForm.accountManagerId}
                    onChange={val => setForm((p: any) => ({ ...p, accountManagerId: val }))}
                    options={internalUsers.map((u: any) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))}
                    placeholder="None" emptyLabel="None"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">Service Team</label>
                  <SearchableSelect
                    value={currentForm.serviceTeamId}
                    onChange={val => setForm((p: any) => ({ ...p, serviceTeamId: val }))}
                    options={teams.map((t: any) => ({ value: t.id, label: t.name }))}
                    placeholder="None" emptyLabel="None"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">Key Client Contact</label>
                  <SearchableSelect
                    value={currentForm.keyContactId}
                    onChange={val => setForm((p: any) => ({ ...p, keyContactId: val }))}
                    options={(company.contacts || []).map((c: any) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))}
                    placeholder="None" emptyLabel="None"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Account Manager</p>
                  {company.accountManager ? (
                    <div className="flex items-center gap-2">
                      <UserAvatar user={company.accountManager} size="xs" />
                      <span className="text-sm text-slate-700">{company.accountManager.firstName} {company.accountManager.lastName}</span>
                    </div>
                  ) : <p className="text-sm text-slate-400">—</p>}
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Service Team</p>
                  {company.serviceTeam ? (
                    <span className="text-xs font-semibold bg-primary-50 text-primary-600 border border-primary-100 px-2 py-0.5 rounded-full">{company.serviceTeam.name}</span>
                  ) : <p className="text-sm text-slate-400">—</p>}
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Key Client Contact</p>
                  {company.keyContact ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck size={13} className="text-indigo-500" />
                        <span className="text-sm font-medium text-slate-700">{company.keyContact.firstName} {company.keyContact.lastName}</span>
                      </div>
                      {company.keyContact.title && <p className="text-xs text-slate-400 ml-5">{company.keyContact.title}</p>}
                      {company.keyContact.email && <p className="text-xs text-slate-500 ml-5">{company.keyContact.email}</p>}
                      {company.keyContact.phone && <p className="text-xs text-slate-500 ml-5">{company.keyContact.phone}</p>}
                    </div>
                  ) : <p className="text-sm text-slate-400">—</p>}
                </div>
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="card p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Activity</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Contacts', value: company._count?.contacts ?? 0, icon: Users },
                { label: 'Tickets', value: company._count?.tickets ?? 0, icon: Ticket },
                { label: 'Contracts', value: company.contracts?.length ?? 0, icon: FileText },
                { label: 'Invoices', value: company.invoices?.length ?? 0, icon: FileText },
              ].map(s => (
                <div key={s.label} className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-xl font-bold text-slate-800">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Tabs */}
        <div className="col-span-2 space-y-4">
          {/* Tab nav */}
          <div className="flex items-center gap-1 border-b border-slate-200">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={clsx(
                  'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                  tab === t.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                <t.icon size={14} />
                {t.label}
                {t.count !== undefined && (
                  <span className={clsx('text-xs px-1.5 py-0.5 rounded-full', tab === t.key ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-500')}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Contacts tab */}
          {tab === 'contacts' && (
            <div className="card overflow-hidden">
              {(company.contacts || []).length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Users size={32} className="mx-auto mb-2 opacity-20" />
                  <p>No contacts yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">Name</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">Title</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">Email</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">Phone</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(company.contacts || []).map((c: any) => (
                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700">
                              {c.firstName[0]}{c.lastName[0]}
                            </div>
                            <span className="text-sm font-medium text-slate-800">{c.firstName} {c.lastName}</span>
                            {company.keyContactId === c.id && (
                              <ShieldCheck size={13} className="text-indigo-500" title="Key Contact" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500">{c.title || '—'}</td>
                        <td className="py-3 px-4 text-sm text-slate-500">{c.email || '—'}</td>
                        <td className="py-3 px-4 text-sm text-slate-500">{c.phone || '—'}</td>
                        <td className="py-3 px-4">
                          {c.canApproveChanges && (
                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">Change Approver</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Leads tab */}
          {tab === 'leads' && (
            <div className="card overflow-hidden">
              {(company.leads || []).length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <TrendingUp size={32} className="mx-auto mb-2 opacity-20" />
                  <p>No leads</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">Title</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">Value</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(company.leads || []).map((l: any) => (
                      <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-sm font-medium text-slate-800">{l.title}</td>
                        <td className="py-3 px-4">
                          <span className={clsx('badge text-xs', statusColors[l.status] || 'bg-slate-100 text-slate-600')}>{l.status}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">{l.value != null ? `£${l.value.toLocaleString()}` : '—'}</td>
                        <td className="py-3 px-4 text-sm text-slate-500">{l.source || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Contracts tab */}
          {tab === 'contracts' && (
            <div className="card overflow-hidden">
              {(company.contracts || []).length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-20" />
                  <p>No contracts</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">Contract</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">Start</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">End</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(company.contracts || []).map((c: any) => (
                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-sm font-medium text-slate-800">{c.title || c.name || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={clsx('badge text-xs', statusColors[c.status] || 'bg-slate-100 text-slate-600')}>{c.status}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500">{c.startDate ? format(new Date(c.startDate), 'MMM d, yyyy') : '—'}</td>
                        <td className="py-3 px-4 text-sm text-slate-500">{c.endDate ? format(new Date(c.endDate), 'MMM d, yyyy') : '—'}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{c.value != null ? `£${c.value.toLocaleString()}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Invoices tab */}
          {tab === 'invoices' && (
            <div className="card overflow-hidden">
              {(company.invoices || []).length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-20" />
                  <p>No invoices</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">Invoice #</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">Issued</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">Due</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(company.invoices || []).map((inv: any) => (
                      <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-sm font-medium text-slate-800">{inv.number}</td>
                        <td className="py-3 px-4">
                          <span className={clsx('badge text-xs', statusColors[inv.status] || 'bg-slate-100 text-slate-600')}>{inv.status}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500">{format(new Date(inv.issueDate), 'MMM d, yyyy')}</td>
                        <td className="py-3 px-4 text-sm text-slate-500">{format(new Date(inv.dueDate), 'MMM d, yyyy')}</td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-700">£{inv.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
