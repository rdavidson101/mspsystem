import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, Search, Users, Mail, Phone, Pencil, ShieldCheck } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', title: '', companyId: '', canApproveChanges: false }

export default function ContactsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editContact, setEditContact] = useState<any>(null)
  const [form, setForm] = useState<any>(emptyForm)

  const { data: rawContacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => api.get('/contacts').then(r => r.data),
  })
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) })

  const uniqueCompanies = [...new Set(rawContacts.map((c: any) => c.company?.name).filter(Boolean))].sort() as string[]
  const contacts = rawContacts.filter((c: any) => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase()
    const matchesSearch = !search || fullName.includes(search.toLowerCase()) || (c.email || '').toLowerCase().includes(search.toLowerCase())
    const matchesCompany = !companyFilter || c.company?.name === companyFilter
    return matchesSearch && matchesCompany
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/contacts', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); closeModal() },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/contacts/${editContact.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); closeModal() },
  })

  const openAdd = () => {
    setEditContact(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (contact: any) => {
    setEditContact(contact)
    setForm({
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      email: contact.email || '',
      phone: contact.phone || '',
      title: contact.title || '',
      companyId: contact.companyId || '',
      canApproveChanges: contact.canApproveChanges ?? false,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditContact(null)
    setForm(emptyForm)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, companyId: form.companyId || undefined }
    if (editContact) updateMutation.mutate(payload)
    else createMutation.mutate(payload)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
          <p className="text-sm text-slate-500">{contacts.length} contacts</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Contact
        </button>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="input pl-9 text-sm w-full" />
        </div>
        <select
          value={companyFilter}
          onChange={e => setCompanyFilter(e.target.value)}
          className="input text-sm max-w-[200px]"
        >
          <option value="">All companies</option>
          {uniqueCompanies.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Name</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Title</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Company</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Email</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Phone</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Change Approver</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact: any) => (
              <tr key={contact.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-primary-700 text-xs font-semibold">{contact.firstName[0]}{contact.lastName[0]}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-800">{contact.firstName} {contact.lastName}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{contact.title || '—'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{contact.company?.name || '—'}</td>
                <td className="py-3 px-4">
                  {contact.email && <a href={`mailto:${contact.email}`} className="text-sm text-primary-600 hover:underline flex items-center gap-1"><Mail size={12} />{contact.email}</a>}
                </td>
                <td className="py-3 px-4">
                  {contact.phone && <span className="text-sm text-slate-600 flex items-center gap-1"><Phone size={12} />{contact.phone}</span>}
                </td>
                <td className="py-3 px-4">
                  {contact.canApproveChanges && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                      <ShieldCheck size={11} /> Approver
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => openEdit(contact)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr><td colSpan={7} className="py-12 text-center text-slate-400">
                <Users size={32} className="mx-auto mb-2 opacity-30" />No contacts yet
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={closeModal} title={editContact ? 'Edit Contact' : 'Add Contact'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">First Name</label><input className="input" value={form.firstName} onChange={e => setForm((f: any) => ({ ...f, firstName: e.target.value }))} required /></div>
            <div><label className="label">Last Name</label><input className="input" value={form.lastName} onChange={e => setForm((f: any) => ({ ...f, lastName: e.target.value }))} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Title</label><input className="input" value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="e.g. IT Manager" /></div>
            <div><label className="label">Company</label>
              <SearchableSelect
                value={form.companyId}
                onChange={val => setForm((f: any) => ({ ...f, companyId: val }))}
                options={companies.map((c: any) => ({ value: c.id, label: c.name }))}
                placeholder="None"
                emptyLabel="None"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <input
              type="checkbox"
              id="canApproveChanges"
              checked={form.canApproveChanges}
              onChange={e => setForm((f: any) => ({ ...f, canApproveChanges: e.target.checked }))}
              className="w-4 h-4 accent-indigo-600"
            />
            <label htmlFor="canApproveChanges" className="flex items-center gap-1.5 text-sm font-medium text-indigo-800 cursor-pointer">
              <ShieldCheck size={14} /> Can approve change requests
            </label>
            <p className="text-xs text-indigo-600 ml-auto">Allows this contact to approve/reject RFCs via email</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={isPending}>{isPending ? 'Saving...' : editContact ? 'Save Changes' : 'Add Contact'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
