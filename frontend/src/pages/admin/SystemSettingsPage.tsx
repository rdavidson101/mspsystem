import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Building2, Save, Check, Star, Shield, Globe, Clock, AlertTriangle, DollarSign } from 'lucide-react'
import clsx from 'clsx'

const CURRENCIES = [
  { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (A$)' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar (C$)' },
  { code: 'NZD', symbol: 'NZ$', label: 'New Zealand Dollar (NZ$)' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen (¥)' },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc (CHF)' },
]

const TIMEZONES = [
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Hong_Kong',
  'Pacific/Auckland',
]

const SESSION_OPTIONS = [
  { value: '1', label: '1 day' },
  { value: '7', label: '7 days (default)' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
]

function Section({ icon: Icon, title, description, children }: {
  icon: React.ElementType; title: string; description: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-primary-600" />
          <h2 className="font-semibold text-slate-900 text-sm">{title}</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

export default function SystemSettingsPage() {
  const qc = useQueryClient()
  const [saved, setSaved] = useState<string | null>(null)

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
  })
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  })

  // Individual field states
  const [mspName, setMspName] = useState('')
  const [currency, setCurrency] = useState('GBP')
  const [timezone, setTimezone] = useState('Europe/London')
  const [enforceMfa, setEnforceMfa] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [sessionDays, setSessionDays] = useState('7')

  useEffect(() => {
    if (settings.mspName) setMspName(settings.mspName)
    if (settings.currency) setCurrency(settings.currency)
    if (settings.timezone) setTimezone(settings.timezone)
    setEnforceMfa(settings.enforceMfa === 'true')
    setMaintenanceMode(settings.maintenanceMode === 'true')
    if (settings.sessionDays) setSessionDays(settings.sessionDays)
  }, [settings])

  const saveMut = useMutation({
    mutationFn: (data: any) => api.patch('/settings', data).then(r => r.data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['companies'] })
      const key = Object.keys(variables)[0]
      setSaved(key)
      setTimeout(() => setSaved(null), 2500)
    },
  })

  const mspCompany = companies.find((c: any) => c.isInternal)

  function SaveButton({ settingKey, value }: { settingKey: string; value: any }) {
    const isSaved = saved === settingKey
    return (
      <button
        onClick={() => saveMut.mutate({ [settingKey]: value })}
        disabled={saveMut.isPending}
        className="flex items-center gap-2 btn-primary px-4 py-2 text-sm disabled:opacity-50"
      >
        {isSaved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save</>}
      </button>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">System Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure your MSP system preferences and security policies.</p>
      </div>

      {/* Row 1 — MSP Identity (full width) */}
      <Section icon={Building2} title="MSP Identity" description="Sets your company name and creates a special MSP customer record that cannot be deleted.">
        <div className="flex gap-6 items-start">
          {/* Input + save */}
          <div className="flex-1 min-w-0 space-y-3">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">MSP Company Name</label>
            <div className="flex gap-3">
              <input
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                value={mspName}
                onChange={e => setMspName(e.target.value)}
                placeholder="e.g. Ryzo IT Solutions"
              />
              <SaveButton settingKey="mspName" value={mspName.trim()} />
            </div>
          </div>

          {/* MSP company card */}
          <div className="flex-1 min-w-0">
            {mspCompany ? (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Building2 size={16} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 truncate">{mspCompany.name}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 flex-shrink-0">
                      <Star size={8} fill="currentColor" /> MSP
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {mspCompany._count?.users ?? 0} team members · {mspCompany._count?.tickets ?? 0} tickets · {mspCompany._count?.projects ?? 0} projects
                  </p>
                </div>
                <span className="text-xs text-amber-600 font-medium bg-amber-100 px-2 py-1 rounded-lg flex-shrink-0">Protected</span>
              </div>
            ) : (
              <div className="text-xs text-slate-400 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 h-full flex items-center">
                No MSP company set yet. Enter a name and click Save to create it.
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Row 2 — Currency, Timezone, Session Length (3 columns) */}
      <div className="grid grid-cols-3 gap-6">
        <Section icon={DollarSign} title="Currency" description="Used for budgets, invoices, and expenses.">
          <div className="space-y-3">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">Currency</label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <SaveButton settingKey="currency" value={currency} />
          </div>
        </Section>

        <Section icon={Globe} title="Timezone" description="Local timezone for dates and times across the system.">
          <div className="space-y-3">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">Timezone</label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <SaveButton settingKey="timezone" value={timezone} />
          </div>
        </Section>

        <Section icon={Clock} title="Session Length" description="How long users stay logged in before re-authentication.">
          <div className="space-y-3">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">Duration</label>
            <select
              value={sessionDays}
              onChange={e => setSessionDays(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              {SESSION_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <SaveButton settingKey="sessionDays" value={sessionDays} />
            <p className="text-xs text-slate-400">Applies to new logins only.</p>
          </div>
        </Section>
      </div>

      {/* Row 3 — Security + Maintenance (2 columns) */}
      <div className="grid grid-cols-2 gap-6">
        <Section icon={Shield} title="Security" description="Authentication and access control policies for your team.">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Enforce MFA for all users</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                All internal users must set up two-factor authentication before accessing the system. Users without MFA will be prompted on their next login.
              </p>
            </div>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0 pt-0.5">
              <button
                onClick={() => {
                  const newVal = !enforceMfa
                  setEnforceMfa(newVal)
                  saveMut.mutate({ enforceMfa: String(newVal) })
                }}
                className={clsx(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  enforceMfa ? 'bg-primary-600' : 'bg-slate-200'
                )}
              >
                <span className={clsx('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', enforceMfa ? 'translate-x-6' : 'translate-x-1')} />
              </button>
              <span className={clsx('text-xs font-semibold', enforceMfa ? 'text-primary-600' : 'text-slate-400')}>
                {enforceMfa ? 'On' : 'Off'}
              </span>
            </div>
          </div>
        </Section>

        <Section icon={AlertTriangle} title="Maintenance Mode" description="When enabled, only administrators can log in.">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Maintenance Mode</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Prevents non-admin users from logging in. Use when performing system maintenance or upgrades.
              </p>
              {maintenanceMode && (
                <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg">
                  <AlertTriangle size={11} />
                  <span className="font-semibold">ACTIVE — only admins can log in.</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0 pt-0.5">
              <button
                onClick={() => {
                  const newVal = !maintenanceMode
                  setMaintenanceMode(newVal)
                  saveMut.mutate({ maintenanceMode: String(newVal) })
                }}
                className={clsx(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  maintenanceMode ? 'bg-amber-500' : 'bg-slate-200'
                )}
              >
                <span className={clsx('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', maintenanceMode ? 'translate-x-6' : 'translate-x-1')} />
              </button>
              <span className={clsx('text-xs font-semibold', maintenanceMode ? 'text-amber-600' : 'text-slate-400')}>
                {maintenanceMode ? 'Active' : 'Off'}
              </span>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
