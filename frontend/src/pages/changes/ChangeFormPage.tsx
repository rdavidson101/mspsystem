import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { changeRef } from '@/lib/refs'
import { ArrowLeft, Save, Send } from 'lucide-react'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { useAuthStore } from '@/store/authStore'

// Defined OUTSIDE the component so they are stable references across renders
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 space-y-4">
      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  )
}

const empty = {
  title: '',
  risk: 'MEDIUM',
  scheduledStart: '',
  durationMinutes: '',
  companyId: '',
  scope: '',
  reason: '',
  risks: '',
  implementationPlan: '',
  validationSteps: '',
  rollbackSteps: '',
  internalApproverId: '',
  clientApproverId: '',
  customerApproverName: '',
  customerApproverEmail: '',
}

export default function ChangeFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id && id !== 'new'
  const [form, setForm] = useState<any>(empty)
  const { user } = useAuthStore()

  const { data: existing } = useQuery({ queryKey: ['change', id], queryFn: () => api.get(`/changes/${id}`).then(r => r.data), enabled: isEdit })
  const { data: approvers = [] } = useQuery({ queryKey: ['change-approvers'], queryFn: () => api.get('/changes/approvers').then(r => r.data) })
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) })
  const { data: clientApprovers = [] } = useQuery({
    queryKey: ['client-approvers', form.companyId],
    queryFn: () => api.get('/changes/client-approvers', { params: { companyId: form.companyId } }).then(r => r.data),
    enabled: !!form.companyId,
  })

  useEffect(() => {
    if (existing) {
      setForm({
        ...existing,
        scheduledStart: existing.scheduledStart ? new Date(existing.scheduledStart).toISOString().slice(0, 16) : '',
        companyId: existing.companyId || '',
        internalApproverId: existing.internalApproverId || '',
        clientApproverId: existing.clientApproverId || '',
      })
    }
  }, [existing])

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev: any) => ({ ...prev, [key]: e.target.value }))

  const saveMutation = useMutation({
    mutationFn: () => isEdit ? api.patch(`/changes/${id}`, form).then(r => r.data) : api.post('/changes', form).then(r => r.data),
    onSuccess: (data) => navigate('/changes/' + changeRef(data.number)),
  })

  const saveAndSubmitMutation = useMutation({
    mutationFn: async () => {
      const data = isEdit ? await api.patch(`/changes/${id}`, form).then(r => r.data) : await api.post('/changes', form).then(r => r.data)
      await api.post(`/changes/${data.id}/submit`)
      return data
    },
    onSuccess: (data) => navigate('/changes/' + changeRef(data.number)),
  })

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/changes')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit RFC' : 'Raise RFC'}</h1>
          {existing && <p className="text-sm text-slate-500">{existing.ref} · {existing.status}</p>}
        </div>
      </div>

      <Section title="Overview">
        <Field label="Change Title" required>
          <input className="input" value={form.title} onChange={f('title')} placeholder="Brief description of the change" />
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Risk Level">
            <select className="input" value={form.risk} onChange={f('risk')}>
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Scheduled Start">
            <input className="input" type="datetime-local" value={form.scheduledStart} onChange={f('scheduledStart')} />
          </Field>
          <Field label="Expected Duration (minutes)">
            <input className="input" type="number" value={form.durationMinutes} onChange={f('durationMinutes')} placeholder="e.g. 120" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Customer">
            <SearchableSelect
              value={form.companyId}
              onChange={val => setForm((prev: any) => ({ ...prev, companyId: val }))}
              options={companies.map((c: any) => ({ value: c.id, label: c.name }))}
              placeholder="Select customer"
              emptyLabel="None"
            />
          </Field>
          <Field label="Scope of Change" required>
            <input className="input" value={form.scope} onChange={f('scope')} placeholder="What systems/services are affected?" />
          </Field>
        </div>
      </Section>

      <Section title="Reason & Risk">
        <Field label="Reason for Change" required>
          <textarea className="input resize-none" rows={4} value={form.reason || ''} onChange={f('reason')} placeholder="Why is this change being made?" />
        </Field>
        <Field label="Risks Surrounding Change" required>
          <textarea className="input resize-none" rows={4} value={form.risks || ''} onChange={f('risks')} placeholder="What could go wrong? What is the impact if it does?" />
        </Field>
      </Section>

      <Section title="Implementation">
        <Field label="Implementation Plan" required>
          <textarea className="input resize-none" rows={5} value={form.implementationPlan || ''} onChange={f('implementationPlan')} placeholder="Step-by-step implementation plan..." />
        </Field>
        <Field label="Validation Steps" required>
          <textarea className="input resize-none" rows={4} value={form.validationSteps || ''} onChange={f('validationSteps')} placeholder="How will you confirm the change was successful?" />
        </Field>
        <Field label="Rollback Steps" required>
          <textarea className="input resize-none" rows={4} value={form.rollbackSteps || ''} onChange={f('rollbackSteps')} placeholder="Steps to reverse the change if something goes wrong..." />
        </Field>
      </Section>

      <Section title="Approvers">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Internal Change Approver" required>
            <SearchableSelect
              value={form.internalApproverId}
              onChange={val => setForm((prev: any) => ({ ...prev, internalApproverId: val }))}
              options={approvers.filter((u: any) => u.id !== user?.id).map((u: any) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))}
              placeholder="Select approver"
              emptyLabel="None"
            />
            {approvers.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No approvers configured. Set change approval rights in Administration → User Management.</p>
            )}
          </Field>
          <Field label="Client Change Approver">
            <SearchableSelect
              value={form.clientApproverId}
              onChange={val => setForm((prev: any) => ({ ...prev, clientApproverId: val }))}
              options={(clientApprovers as any[]).map((c: any) => ({ value: c.id, label: `${c.firstName} ${c.lastName} (${c.email})` }))}
              placeholder={form.companyId ? 'Select client approver' : 'Select a customer first'}
              emptyLabel="None"
              disabled={!form.companyId}
            />
            {form.companyId && (clientApprovers as any[]).length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No contacts with change approval rights for this customer. Set rights in the contact record.</p>
            )}
          </Field>
        </div>
      </Section>

      <div className="flex items-center gap-3 justify-end pb-6">
        <button onClick={() => navigate('/changes')} className="btn-secondary text-sm">Cancel</button>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!form.title || saveMutation.isPending}
          className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <Save size={14} /> {saveMutation.isPending ? 'Saving…' : 'Save as Draft'}
        </button>
        <button
          onClick={() => saveAndSubmitMutation.mutate()}
          disabled={!form.title || !form.internalApproverId || saveAndSubmitMutation.isPending}
          className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <Send size={14} /> {saveAndSubmitMutation.isPending ? 'Submitting…' : 'Submit for Approval'}
        </button>
      </div>
    </div>
  )
}
