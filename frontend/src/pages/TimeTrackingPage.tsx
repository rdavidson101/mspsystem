import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, Clock, Play, Square } from 'lucide-react'
import { format } from 'date-fns'
import Modal from '@/components/ui/Modal'
import { useAuthStore } from '@/store/authStore'

export default function TimeTrackingPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [showModal, setShowModal] = useState(false)
  const [running, setRunning] = useState(false)
  const [timer, setTimer] = useState(0)
  const [timerInterval, setTimerInterval] = useState<any>(null)
  const [form, setForm] = useState({ description: '', hours: '', date: new Date().toISOString().split('T')[0], billable: true, ticketId: '', taskId: '', projectId: '' })

  const { data: entries = [] } = useQuery({ queryKey: ['time-entries'], queryFn: () => api.get('/time-entries').then(r => r.data) })
  const { data: tickets = [] } = useQuery({ queryKey: ['tickets'], queryFn: () => api.get('/tickets').then(r => r.data) })
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => api.get('/tasks').then(r => r.data) })
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects').then(r => r.data) })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/time-entries', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['time-entries'] }); setShowModal(false) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/time-entries/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries'] }),
  })

  function startTimer() {
    setRunning(true)
    const interval = setInterval(() => setTimer(t => t + 1), 1000)
    setTimerInterval(interval)
  }
  function stopTimer() {
    setRunning(false)
    clearInterval(timerInterval)
    const hours = (timer / 3600).toFixed(2)
    setForm(f => ({ ...f, hours }))
    setTimer(0)
    setShowModal(true)
  }

  const totalHours = entries.reduce((s: number, e: any) => s + e.hours, 0)
  const billableHours = entries.filter((e: any) => e.billable).reduce((s: number, e: any) => s + e.hours, 0)
  const todayHours = entries.filter((e: any) => format(new Date(e.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).reduce((s: number, e: any) => s + e.hours, 0)

  function formatTimer(s: number) {
    const h = Math.floor(s / 3600).toString().padStart(2, '0')
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${h}:${m}:${sec}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Time Tracking</h1>
          <p className="text-sm text-slate-500">{entries.length} time entries</p>
        </div>
        <div className="flex gap-2">
          {running ? (
            <button onClick={stopTimer} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Square size={14} /> Stop ({formatTimer(timer)})
            </button>
          ) : (
            <button onClick={startTimer} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Play size={14} /> Start Timer
            </button>
          )}
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Log Time
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Today</p>
          <p className="text-2xl font-bold text-slate-900">{todayHours.toFixed(1)}h</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Total Logged</p>
          <p className="text-2xl font-bold text-primary-600">{totalHours.toFixed(1)}h</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Billable Hours</p>
          <p className="text-2xl font-bold text-green-600">{billableHours.toFixed(1)}h</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Date</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Description</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Linked To</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">User</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Hours</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Billable</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry: any) => (
              <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-xs text-slate-500">{format(new Date(entry.date), 'MMM d, yyyy')}</td>
                <td className="py-3 px-4 text-sm text-slate-700">{entry.description || '—'}</td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {entry.ticket ? `Ticket #${entry.ticket.number}` : entry.task?.title || entry.project?.name || '—'}
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">{entry.user?.firstName} {entry.user?.lastName}</td>
                <td className="py-3 px-4 text-sm font-semibold text-primary-600">{entry.hours}h</td>
                <td className="py-3 px-4">
                  <span className={`badge text-xs ${entry.billable ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {entry.billable ? 'Billable' : 'Non-billable'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button onClick={() => deleteMutation.mutate(entry.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-slate-400"><Clock size={32} className="mx-auto mb-2 opacity-30" />No time entries yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Log Time">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ ...form, hours: Number(form.hours), ticketId: form.ticketId || undefined, taskId: form.taskId || undefined, projectId: form.projectId || undefined }) }} className="space-y-4">
          <div><label className="label">Description</label><input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Hours</label><input type="number" step="0.25" min="0.25" className="input" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} required /></div>
            <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required /></div>
          </div>
          <div><label className="label">Link to Ticket (optional)</label><select className="input" value={form.ticketId} onChange={e => setForm(f => ({ ...f, ticketId: e.target.value }))}><option value="">None</option>{tickets.map((t: any) => <option key={t.id} value={t.id}>#{t.number} - {t.title}</option>)}</select></div>
          <div><label className="label">Link to Task (optional)</label><select className="input" value={form.taskId} onChange={e => setForm(f => ({ ...f, taskId: e.target.value }))}><option value="">None</option>{tasks.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
          <div><label className="label">Link to Project (optional)</label><select className="input" value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}><option value="">None</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.billable} onChange={e => setForm(f => ({ ...f, billable: e.target.checked }))} /><span className="text-sm text-slate-700">Billable</span></label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Log Time'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
