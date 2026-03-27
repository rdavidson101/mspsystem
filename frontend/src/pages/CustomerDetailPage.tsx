import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  ArrowLeft, Building2, Phone, Mail, Globe, MapPin, Pencil, Save, X,
  Users, Ticket, FileText, TrendingUp, Star, Power, PowerOff, Trash2, ShieldCheck
} from 'lucide-react'
import clsx from 'clsx'
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import UserAvatar from '@/components/ui/UserAvatar'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'

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

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-4 flex flex-col">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
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
    onSuccess: (data: any) => { if (!form) setForm(buildForm(data)) },
  })

  const { data: allTickets = [] } = useQuery({
    queryKey: ['tickets', 'company', id],
    queryFn: () => api.get('/tickets', { params: { companyId: id } }).then(r => r.data),
    enabled: !!id,
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

  // SLA adherence calculation
  const slaData = useMemo(() => {
    const withSla = allTickets.filter((t: any) => t.slaResolutionDue)
    if (withSla.length === 0) return null
    const now = new Date()
    let met = 0, breached = 0
    for (const t of withSla) {
      const due = new Date(t.slaResolutionDue)
      const resolved = t.resolvedAt ? new Date(t.resolvedAt) : null
      const isDone = ['RESOLVED', 'CLOSED'].includes(t.status)
      if (isDone && resolved) {
        resolved <= due ? met++ : breached++
      } else {
        now <= due ? met++ : breached++
      }
    }
    const pct = withSla.length > 0 ? Math.round((met / withSla.length) * 100) : 0
    return {
      pct,
      chart: [
        { name: 'Met', value: met, color: '#22c55e' },
        { name: 'Breached', value: breached, color: '#ef4444' },
      ],
    }
  }, [allTickets])

  // Revenue per month (last 6 months from invoices)
  const revenueData = useMemo(() => {
    const invoices = company?.invoices || []
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i)
      return { label: format(d, 'MMM'), start: startOfMonth(d), end: endOfMonth(d), paid: 0, outstanding: 0 }
    })
    for (const inv of invoices) {
      const date = new Date(inv.issueDate)
      const m = months.find(m => isWithinInterval(date, { start: m.start, end: m.end }))
      if (!m) continue
      if (inv.status === 'PAID') m.paid += inv.total
      else if (['SENT', 'OVERDUE'].includes(inv.status)) m.outstanding += inv.total
    }
    return months.map(m => ({ label: m.label, Paid: Math.round(m.paid), Outstanding: Math.round(m.outstanding) }))
  }, [company])

  const totalRevenue = useMemo(() => (company?.invoices || []).filter((i: any) => i.status === 'PAID').reduce((s: number, i: any) => s + i.total, 0), [company])
  const outstanding = useMemo(() => (company?.invoices || []).filter((i: any) => ['SENT', 'OVERDUE'].includes(i.status)).reduce((s: number, i: any) => s + i.total, 0), [company])

  const tabs: { key: Tab; label: string; icon: any; count: number }[] = [
    { key: 'contacts', label: 'Contacts', icon: Users, count: company?._count?.contacts ?? 0 },
    { key: 'leads', label: 'Leads', icon: TrendingUp, count: company?.leads?.length ?? 0 },
    { key: 'contracts', label: 'Contracts', icon: FileText, count: company?.contracts?.length ?? 0 },
    { key: 'invoices', label: 'Invoices', icon: FileText, count: company?.invoices?.length ?? 0 },
  ]

  if (isLoading || !company) return (
    <div className="flex items-center justify-center py-24 text-slate-400">
      <Building2 size={32} className="opacity-20 mr-3" />Loading…
    </div>
  )

  const isDisabled = company.isActive === false
  const currentForm = form || buildForm(company)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/customers')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 mt-0.5 flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">{company.name}</h1>
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
          {company.industry && <p className="text-sm text-slate-400 mt-0.5">{company.industry}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!company.isInternal && (
            <>
              <button
                onClick={() => toggleMut.mutate()}
                disabled={toggleMut.isPending}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600 transition-colors"
                title={isDisabled ? 'Enable' : 'Disable'}
              >
                {isDisabled ? <Power size={16} /> : <PowerOff size={16} />}
              </button>
              <button
                onClick={() => { if (confirm(`Delete ${company.name}? This permanently removes all associated data.`)) deleteMut.mutate() }}
                className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
          {editing ? (
            <div className="flex gap-2">
              <button onClick={() => { setEditing(false); setForm(buildForm(company)) }} className="btn-secondary text-sm flex items-center gap-1.5">
                <X size={14} /> Cancel
              </button>
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

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`£${totalRevenue.toLocaleString()}`} sub="all time paid invoices" />
        <StatCard label="Outstanding" value={`£${outstanding.toLocaleString()}`} sub="sent & overdue invoices" />
        <StatCard label="Open Tickets" value={allTickets.filter((t: any) => !['RESOLVED','CLOSED'].includes(t.status)).length} sub="active tickets" />
        <StatCard
          label="SLA Adherence"
          value={slaData ? `${slaData.pct}%` : '—'}
          sub={slaData ? `${slaData.chart[0].value} met / ${slaData.chart[1].value} breached` : 'no SLA data'}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-5">
        {/* Revenue chart */}
        <div className="col-span-2 card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Revenue (last 6 months)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueData} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `£${v.toLocaleString()}`} />
              <ReTooltip formatter={(v: any) => `£${Number(v).toLocaleString()}`} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Paid" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Outstanding" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SLA donut */}
        <div className="card p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">SLA Adherence</h3>
          {slaData ? (
            <>
              <div className="flex-1 flex items-center justify-center">
                <div className="relative">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={slaData.chart} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" strokeWidth={0}>
                        {slaData.chart.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <ReTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-slate-900">{slaData.pct}%</span>
                    <span className="text-[10px] text-slate-400">met</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {slaData.chart.map(e => (
                  <div key={e.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />
                    <span className="text-xs text-slate-500">{e.name} ({e.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400">No SLA data</div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-3 gap-5">
        {/* Left sidebar */}
        <div className="col-span-1 space-y-4">
          {/* Company info */}
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Company Info</h3>
            {editing ? (
              <div className="space-y-3">
                {[
                  { label: 'Company Name *', k: 'name' },
                  { label: 'Industry', k: 'industry' },
                ].map(({ label, k }) => (
                  <div key={k}>
                    <label className="label">{label}</label>
                    <input className="input" value={currentForm[k] || ''} onChange={e => setForm((p: any) => ({ ...p, [k]: e.target.value }))} />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2">
                  {[{ label: 'Phone', k: 'phone' }, { label: 'Email', k: 'email' }].map(({ label, k }) => (
                    <div key={k}>
                      <label className="label">{label}</label>
                      <input className="input" value={currentForm[k] || ''} onChange={e => setForm((p: any) => ({ ...p, [k]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="label">Website</label>
                  <input className="input" value={currentForm.website || ''} onChange={e => setForm((p: any) => ({ ...p, website: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Address</label>
                  <input className="input" value={currentForm.address || ''} onChange={e => setForm((p: any) => ({ ...p, address: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[{ label: 'City', k: 'city' }, { label: 'Country', k: 'country' }].map(({ label, k }) => (
                    <div key={k}>
                      <label className="label">{label}</label>
                      <input className="input" value={currentForm[k] || ''} onChange={e => setForm((p: any) => ({ ...p, [k]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea rows={3} className="input resize-none" value={currentForm.notes || ''} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {company.phone && <div className="flex items-center gap-2 text-sm text-slate-600"><Phone size={13} className="text-slate-400" />{company.phone}</div>}
                {company.email && <div className="flex items-center gap-2 text-sm text-slate-600"><Mail size={13} className="text-slate-400" /><a href={`mailto:${company.email}`} className="hover:text-primary-600">{company.email}</a></div>}
                {company.website && <div className="flex items-center gap-2 text-sm text-slate-600"><Globe size={13} className="text-slate-400" /><a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 truncate">{company.website.replace(/^https?:\/\//, '')}</a></div>}
                {(company.city || company.country) && <div className="flex items-center gap-2 text-sm text-slate-600"><MapPin size={13} className="text-slate-400" />{[company.city, company.country].filter(Boolean).join(', ')}</div>}
                {company.notes && <p className="text-sm text-slate-500 pt-2 border-t border-slate-100 whitespace-pre-wrap">{company.notes}</p>}
                {!company.phone && !company.email && !company.website && !company.city && !company.notes && (
                  <p className="text-sm text-slate-400 italic">No contact details added</p>
                )}
              </div>
            )}
          </div>

          {/* Management */}
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Management</h3>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="label">Account Manager</label>
                  <SearchableSelect
                    value={currentForm.accountManagerId}
                    onChange={val => setForm((p: any) => ({ ...p, accountManagerId: val }))}
                    options={internalUsers.map((u: any) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))}
                    placeholder="None" emptyLabel="None"
                  />
                </div>
                <div>
                  <label className="label">Service Team</label>
                  <SearchableSelect
                    value={currentForm.serviceTeamId}
                    onChange={val => setForm((p: any) => ({ ...p, serviceTeamId: val }))}
                    options={teams.map((t: any) => ({ value: t.id, label: t.name }))}
                    placeholder="None" emptyLabel="None"
                  />
                </div>
                <div>
                  <label className="label">Key Client Contact</label>
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
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Account Manager</p>
                  {company.accountManager ? (
                    <div className="flex items-center gap-2">
                      <UserAvatar user={company.accountManager} size="xs" />
                      <span className="text-sm text-slate-700">{company.accountManager.firstName} {company.accountManager.lastName}</span>
                    </div>
                  ) : <p className="text-sm text-slate-400">—</p>}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Service Team</p>
                  {company.serviceTeam
                    ? <span className="text-xs font-semibold bg-primary-50 text-primary-600 border border-primary-100 px-2 py-0.5 rounded-full">{company.serviceTeam.name}</span>
                    : <p className="text-sm text-slate-400">—</p>}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Key Client Contact</p>
                  {company.keyContact ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck size={13} className="text-indigo-500 flex-shrink-0" />
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
        </div>

        {/* Right: tabs */}
        <div className="col-span-2 space-y-4">
          {/* Tab nav */}
          <div className="flex items-center gap-1 border-b border-slate-200">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={clsx(
                  'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                  tab === t.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                <t.icon size={14} />
                {t.label}
                <span className={clsx('text-xs px-1.5 py-0.5 rounded-full', tab === t.key ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-500')}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Contacts */}
          {tab === 'contacts' && (
            <div className="card overflow-hidden">
              {(company.contacts || []).length === 0 ? (
                <div className="py-12 text-center text-slate-400"><Users size={32} className="mx-auto mb-2 opacity-20" /><p className="text-sm">No contacts yet</p></div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      {['Name', 'Title', 'Email', 'Phone', ''].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(company.contacts || []).map((c: any) => (
                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700 flex-shrink-0">
                              {c.firstName?.[0]}{c.lastName?.[0]}
                            </div>
                            <span className="text-sm font-medium text-slate-800">{c.firstName} {c.lastName}</span>
                            {company.keyContactId === c.id && <ShieldCheck size={13} className="text-indigo-500" />}
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

          {/* Leads */}
          {tab === 'leads' && (
            <div className="card overflow-hidden">
              {(company.leads || []).length === 0 ? (
                <div className="py-12 text-center text-slate-400"><TrendingUp size={32} className="mx-auto mb-2 opacity-20" /><p className="text-sm">No leads</p></div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      {['Title', 'Status', 'Value', 'Source'].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(company.leads || []).map((l: any) => (
                      <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-sm font-medium text-slate-800">{l.title}</td>
                        <td className="py-3 px-4"><span className={clsx('badge text-xs', statusColors[l.status] || 'bg-slate-100 text-slate-600')}>{l.status}</span></td>
                        <td className="py-3 px-4 text-sm text-slate-600">{l.value != null ? `£${l.value.toLocaleString()}` : '—'}</td>
                        <td className="py-3 px-4 text-sm text-slate-500">{l.source || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Contracts */}
          {tab === 'contracts' && (
            <div className="card overflow-hidden">
              {(company.contracts || []).length === 0 ? (
                <div className="py-12 text-center text-slate-400"><FileText size={32} className="mx-auto mb-2 opacity-20" /><p className="text-sm">No contracts</p></div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      {['Contract', 'Status', 'Start', 'End', 'Value'].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(company.contracts || []).map((c: any) => (
                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-sm font-medium text-slate-800">{c.title || c.name || '—'}</td>
                        <td className="py-3 px-4"><span className={clsx('badge text-xs', statusColors[c.status] || 'bg-slate-100 text-slate-600')}>{c.status}</span></td>
                        <td className="py-3 px-4 text-sm text-slate-500">{c.startDate ? format(new Date(c.startDate), 'MMM d, yyyy') : '—'}</td>
                        <td className="py-3 px-4 text-sm text-slate-500">{c.endDate ? format(new Date(c.endDate), 'MMM d, yyyy') : '—'}</td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-700">{c.value != null ? `£${c.value.toLocaleString()}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Invoices */}
          {tab === 'invoices' && (
            <div className="card overflow-hidden">
              {(company.invoices || []).length === 0 ? (
                <div className="py-12 text-center text-slate-400"><FileText size={32} className="mx-auto mb-2 opacity-20" /><p className="text-sm">No invoices</p></div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      {['Invoice #', 'Status', 'Issued', 'Due', 'Total'].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(company.invoices || []).map((inv: any) => (
                      <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-sm font-medium text-slate-800 font-mono">{inv.number}</td>
                        <td className="py-3 px-4"><span className={clsx('badge text-xs', statusColors[inv.status] || 'bg-slate-100 text-slate-600')}>{inv.status}</span></td>
                        <td className="py-3 px-4 text-sm text-slate-500">{format(new Date(inv.issueDate), 'MMM d, yyyy')}</td>
                        <td className="py-3 px-4 text-sm text-slate-500">{format(new Date(inv.dueDate), 'MMM d, yyyy')}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-slate-700">£{inv.total.toLocaleString()}</td>
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
