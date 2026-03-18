import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { Package, MapPin, User, Trash2 } from 'lucide-react'
import clsx from 'clsx'

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
}

const nextStatus: Record<string, string> = {
  PENDING: 'PROCESSING',
  PROCESSING: 'SHIPPED',
  SHIPPED: 'DELIVERED',
}

const nextLabel: Record<string, string> = {
  PENDING: 'Mark Processing',
  PROCESSING: 'Mark Shipped',
  SHIPPED: 'Mark Delivered',
}

export default function ShipmentsPage() {
  const qc = useQueryClient()
  const { data: shipments = [] } = useQuery({ queryKey: ['shipments'], queryFn: () => api.get('/inventory/shipments').then(r => r.data) })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/inventory/shipments/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shipments'] }); qc.invalidateQueries({ queryKey: ['assets'] }) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/shipments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipments'] }),
  })

  const pending = shipments.filter((s: any) => s.status === 'PENDING')
  const active = shipments.filter((s: any) => ['PROCESSING', 'SHIPPED'].includes(s.status))
  const completed = shipments.filter((s: any) => ['DELIVERED', 'CANCELLED'].includes(s.status))

  const isCompleted = (s: any) => ['DELIVERED', 'CANCELLED'].includes(s.status)

  const ShipmentCard = ({ s }: { s: any }) => (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
            <Package size={16} className="text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{s.asset?.name}</p>
            <p className="text-xs text-slate-400 font-mono">{s.asset?.ref || ''} {s.asset?.serialNumber ? `· S/N ${s.asset.serialNumber}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx('badge text-xs', statusColors[s.status])}>{s.status}</span>
          {isCompleted(s) && (
            <button
              onClick={() => deleteMutation.mutate(s.id)}
              className="p-1 hover:bg-red-50 rounded text-slate-300 hover:text-red-400 transition-colors"
              title="Remove from dashboard"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
        <div className="flex items-start gap-1.5">
          <User size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-slate-700">{s.recipientName}</p>
            {s.company && <p className="text-slate-500">{s.company}</p>}
          </div>
        </div>
        <div className="flex items-start gap-1.5">
          <MapPin size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <p>{s.addressLine1}</p>
            {s.addressLine2 && <p>{s.addressLine2}</p>}
            <p>{s.city}{s.zip ? `, ${s.zip}` : ''}</p>
            <p>{s.country}</p>
          </div>
        </div>
      </div>
      <div className="pt-1 border-t border-slate-100">
        <p className="text-xs text-slate-500"><span className="font-medium text-slate-700">Purpose:</span> {s.purpose}</p>
        {s.notes && <p className="text-xs text-slate-500 mt-0.5"><span className="font-medium">Notes:</span> {s.notes}</p>}
        <p className="text-xs text-slate-400 mt-1">Requested by {s.requestedBy?.firstName} {s.requestedBy?.lastName} · {format(new Date(s.createdAt), 'MMM d, yyyy')}</p>
      </div>
      {nextStatus[s.status] && (
        <div className="flex gap-2">
          <button
            onClick={() => updateMutation.mutate({ id: s.id, status: nextStatus[s.status] })}
            className="flex-1 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {nextLabel[s.status]}
          </button>
          <button
            onClick={() => updateMutation.mutate({ id: s.id, status: 'CANCELLED' })}
            className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-500 text-xs font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Shipment Requests</h1>
        <p className="text-sm text-slate-500">{pending.length} pending · {active.length} in progress</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-400 rounded-full" /> Pending ({pending.length})
          </h2>
          {pending.map((s: any) => <ShipmentCard key={s.id} s={s} />)}
          {pending.length === 0 && <div className="card p-6 text-center text-xs text-slate-400">No pending shipments</div>}
        </div>
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-400 rounded-full" /> In Progress ({active.length})
          </h2>
          {active.map((s: any) => <ShipmentCard key={s.id} s={s} />)}
          {active.length === 0 && <div className="card p-6 text-center text-xs text-slate-400">No active shipments</div>}
        </div>
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full" /> Completed ({completed.length})
          </h2>
          {completed.slice(0, 10).map((s: any) => <ShipmentCard key={s.id} s={s} />)}
          {completed.length === 0 && <div className="card p-6 text-center text-xs text-slate-400">No completed shipments</div>}
        </div>
      </div>
    </div>
  )
}
