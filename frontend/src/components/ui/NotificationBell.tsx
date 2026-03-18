import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Bell, Ticket, CheckCheck, X, Trash2, AtSign } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['notifications'] })
  qc.invalidateQueries({ queryKey: ['notifications', 'count'] })
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  const { data: countData } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data),
    refetchInterval: 10000,
  })

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    enabled: open,
    refetchInterval: open ? 10000 : false,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => invalidateAll(qc),
  })

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => invalidateAll(qc),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => invalidateAll(qc),
  })

  const clearReadMutation = useMutation({
    mutationFn: () => api.delete('/notifications/clear-read'),
    onSuccess: () => invalidateAll(qc),
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Refresh count when dropdown opens
  useEffect(() => {
    if (open) qc.invalidateQueries({ queryKey: ['notifications', 'count'] })
  }, [open, qc])

  const unread = countData?.count || 0
  const hasRead = notifications.some((n: any) => n.read)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
              {unread > 0 && (
                <span className="bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{unread} unread</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
              {hasRead && (
                <button
                  onClick={() => clearReadMutation.mutate()}
                  className="text-xs text-slate-400 hover:text-red-500 font-medium flex items-center gap-1"
                  title="Delete all read notifications"
                >
                  <Trash2 size={12} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">No notifications</p>
              </div>
            ) : (
              notifications.map((n: any) => (
                <div
                  key={n.id}
                  className={clsx('group px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors', !n.read && 'bg-blue-50/50')}
                >
                  <div className="flex items-start gap-3">
                    {/* Unread dot */}
                    <div className="flex-shrink-0 mt-2">
                      {!n.read
                        ? <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        : <div className="w-2 h-2" />
                      }
                    </div>
                    <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                      n.type === 'TICKET_ASSIGNED' ? 'bg-primary-100'
                      : n.type === 'TASK_MENTION' ? 'bg-purple-100'
                      : 'bg-slate-100'
                    )}>
                      {n.type === 'TICKET_ASSIGNED' && <Ticket size={13} className="text-primary-600" />}
                      {n.type === 'TASK_MENTION' && <AtSign size={13} className="text-purple-600" />}
                      {n.type !== 'TICKET_ASSIGNED' && n.type !== 'TASK_MENTION' && <Bell size={13} className="text-slate-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={clsx('text-xs font-semibold', !n.read ? 'text-slate-900' : 'text-slate-600')}>{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-slate-400">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                        {(n.ticketId || n.link) && (
                          <Link
                            to={n.link || `/tickets/${n.ticketId}`}
                            onClick={() => { if (!n.read) markReadMutation.mutate(n.id); setOpen(false) }}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            View →
                          </Link>
                        )}
                        {!n.read && (
                          <button
                            onClick={() => markReadMutation.mutate(n.id)}
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Delete button — visible on hover */}
                    <button
                      onClick={() => deleteMutation.mutate(n.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-slate-300 hover:text-red-400 transition-all flex-shrink-0"
                      title="Delete"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
