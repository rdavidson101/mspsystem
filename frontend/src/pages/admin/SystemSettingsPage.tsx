import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Building2, Save, Check, Star } from 'lucide-react'
import clsx from 'clsx'

export default function SystemSettingsPage() {
  const qc = useQueryClient()
  const [mspName, setMspName] = useState('')
  const [saved, setSaved] = useState(false)

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
  })

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then(r => r.data),
  })

  useEffect(() => {
    if (settings.mspName) setMspName(settings.mspName)
  }, [settings.mspName])

  const saveMut = useMutation({
    mutationFn: (data: any) => api.patch('/settings', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['companies'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  const mspCompany = companies.find((c: any) => c.isInternal)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">System Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure your MSP identity and global settings.</p>
      </div>

      {/* MSP Identity */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-primary-600" />
            <h2 className="font-semibold text-slate-900 text-sm">MSP Identity</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">Sets your company name and creates a special MSP customer record that cannot be deleted.</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-2">MSP Company Name</label>
            <div className="flex gap-3">
              <input
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                value={mspName}
                onChange={e => setMspName(e.target.value)}
                placeholder="e.g. Ryzo IT Solutions"
              />
              <button
                onClick={() => { if (mspName.trim()) saveMut.mutate({ mspName: mspName.trim() }) }}
                disabled={!mspName.trim() || saveMut.isPending}
                className="flex items-center gap-2 btn-primary px-4 py-2 text-sm disabled:opacity-50"
              >
                {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save</>}
              </button>
            </div>
          </div>

          {/* MSP Company preview */}
          {mspCompany && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Building2 size={16} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{mspCompany.name}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    <Star size={8} fill="currentColor" /> MSP
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {mspCompany._count?.users ?? 0} team members · {mspCompany._count?.tickets ?? 0} tickets · {mspCompany._count?.projects ?? 0} projects
                </p>
              </div>
              <span className="text-xs text-amber-600 font-medium bg-amber-100 px-2 py-1 rounded-lg flex-shrink-0">Protected</span>
            </div>
          )}

          {!mspCompany && (
            <div className="text-xs text-slate-400 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
              No MSP company set yet. Enter a name above and click Save to create it.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
