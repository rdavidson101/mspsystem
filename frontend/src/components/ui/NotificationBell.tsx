import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Bell, Ticket, CheckCheck, X, Trash2, AtSign, GitPullRequest } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['notifications'] })
  qc.invalidateQueries({ queryKey: ['notifications', 'count'] })
}

function NotifIcon({ type }: { type: string }) {
  if (type === 'TICKET_ASSIGNED' || type === 'TICKET_UPDATED')
    return <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0"><Ticket size={14} className="text-blue-600" /></div>
  if (type === 'MENTION' || type === 'TASK_MENTION')
    return <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0"><AtSign size={14} className="text-purple-600" /></div>
  if (type === 'CHANGE_APPROVAL')
    return <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0"><GitPullRequest size={14} className="text-amber-600" /></div>
  return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0"><Bell size={14} className="text-slate-500" /></div>
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

  useEffect(() => {
    if (open) qc.invalidateQueries({ queryKey: ['notifications', 'count'] })
  }, [open, qc])

  const unread = countData?.count || 0
  const hasRead = notifications.some((n: any) => n.read)

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
              {unread > 0 && (
                <span className="bg-red-100 text-red-600 text-[11px] font-bold px-2 py-0.5 rounded-full">{unread} unread</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  title="Mark all as read"
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded hover:bg-primary-50 transition-colors"
                >
                  <CheckCheck size={13} />
                  Mark all read
                </button>
              )}
              {hasRead && (
                <button
                  onClick={() => clearReadMutation.mutate()}
                  title="Clear read notifications"
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[440px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell size={20} className="text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">All caught up</p>
                <p className="text-xs text-slate-400 mt-0.5">No notifications right now</p>
              </div>
            ) : (
              notifications.map((n: any) => (
                <div
                  key={n.id}
                  className={clsx(
                    'group relative flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-default',
                    !n.read && 'bg-blue-50/40'
                  )}
                  onClick={() => { if (!n.read) markReadMutation.mutate(n.id) }}
                >
                  {/* Unread indicator strip */}
                  {!n.read && (
                    <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-blue-500 rounded-r" />
                  )}

                  <NotifIcon type={n.type} />

                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className={clsx('text-sm font-semibold leading-snug', !n.read ? 'text-slate-900' : 'text-slate-700')}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11px] text-slate-400">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                      {n.link && (
                        <Link
                          to={n.link}
                          onClick={(e) => { e.stopPropagation(); if (!n.read) markReadMutation.mutate(n.id); setOpen(false) }}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium hover:underline"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Delete — appears on hover */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(n.id) }}
                    title="Dismiss"
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all mt-0.5"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
