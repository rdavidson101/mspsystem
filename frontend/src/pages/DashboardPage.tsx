import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { format } from 'date-fns'
import {
  Ticket, FolderKanban, CheckSquare, FileText,
  Clock, RefreshCw, Plus, ChevronRight, Circle, CheckCircle2
} from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const paymentData = [
  { name: 'Mon', thisWeek: 4000, lastWeek: 3000 },
  { name: 'Tue', thisWeek: 3000, lastWeek: 2500 },
  { name: 'Wed', thisWeek: 5000, lastWeek: 4000 },
  { name: 'Thu', thisWeek: 4500, lastWeek: 3800 },
  { name: 'Fri', thisWeek: 6000, lastWeek: 5000 },
  { name: 'Sat', thisWeek: 3500, lastWeek: 2800 },
  { name: 'Sun', thisWeek: 4200, lastWeek: 3500 },
]

function StatCard({ label, value, total, icon: Icon, color }: {
  label: string; value: number; total: number; icon: any; color: string
}) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="card p-5 flex-1">
      <div className="flex items-center gap-3 mb-3">
        <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', color)}>
          <Icon size={18} className="text-white" />
        </div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold text-slate-900 mb-2">
        {String(value).padStart(2, '0')}/{String(total).padStart(2, '0')}
      </p>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const statusColors: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-orange-100 text-orange-700',
  NOT_STARTED: 'bg-red-100 text-red-700',
  OPEN: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-600',
}

const priorityIcons: Record<string, string> = {
  LOW: '▁▂▃',
  MEDIUM: '▁▂▃▄',
  HIGH: '▁▂▃▄▅',
  CRITICAL: '▁▂▃▄▅▆',
}

function TaskRow({ task, index }: { task: any; index: number }) {
  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
      <td className="py-3 px-4 text-xs text-slate-400">{String(index + 1).padStart(2, '0')}</td>
      <td className="py-3 px-4">
        <p className="text-sm font-medium text-slate-800 truncate max-w-[180px]">{task.title}</p>
        <p className="text-xs text-slate-400">{task.project?.name || '—'}</p>
      </td>
      <td className="py-3 px-4 text-xs text-slate-500">
        {task.startDate ? format(new Date(task.startDate), 'MMM d') : '—'}
        {task.dueDate ? ` – ${format(new Date(task.dueDate), 'MMM d')}` : ''}
      </td>
      <td className="py-3 px-4">
        <span className="text-xs text-slate-600 font-mono">{priorityIcons[task.priority]}</span>
        <span className="text-xs text-slate-500 ml-1">{task.priority?.charAt(0) + task.priority?.slice(1).toLowerCase()}</span>
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-1 flex-wrap">
          {(task.tags || []).slice(0, 2).map((tag: string) => (
            <span key={tag} className="badge bg-blue-50 text-blue-600 text-xs">{tag}</span>
          ))}
        </div>
      </td>
      <td className="py-3 px-4">
        <span className={clsx('badge text-xs', statusColors[task.status] || 'bg-slate-100 text-slate-600')}>
          {task.status?.replace(/_/g, ' ')}
        </span>
      </td>
    </tr>
  )
}

function TodoItem({ todo, onToggle }: { todo: any; onToggle: (id: string, completed: boolean) => void }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <button
        onClick={() => onToggle(todo.id, !todo.completed)}
        className={clsx(
          'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
          todo.completed
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-slate-300 hover:border-primary-500'
        )}
      >
        {todo.completed && <CheckCircle2 size={12} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-medium truncate', todo.completed && 'line-through text-slate-400')}>
          {todo.title}
        </p>
        <p className="text-xs text-slate-400 truncate">{todo.description}</p>
        <div className="flex items-center gap-2 mt-1">
          {(todo.tags || []).map((tag: string) => (
            <span key={tag} className={clsx('badge text-xs',
              tag === 'Today' ? 'bg-blue-50 text-blue-600' :
              tag === 'Meeting' ? 'bg-purple-50 text-purple-600' :
              tag === 'To-do' ? 'bg-orange-50 text-orange-600' :
              'bg-slate-100 text-slate-600'
            )}>{tag}</span>
          ))}
          {todo.dueDate && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock size={10} />
              {format(new Date(todo.dueDate), 'MMM d')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
  })
  const { data: todos, refetch: refetchTodos } = useQuery({
    queryKey: ['todos'],
    queryFn: () => api.get('/todos').then(r => r.data),
  })

  const stats = data?.stats
  const tasks = data?.recentTasks || []
  const ongoingTodos = (todos || []).filter((t: any) => !t.completed)
  const completedTodos = (todos || []).filter((t: any) => t.completed)

  async function toggleTodo(id: string, completed: boolean) {
    await api.put(`/todos/${id}`, { completed })
    refetchTodos()
  }

  return (
    <div className="space-y-6">
      {/* Welcome + title */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">Welcome,</p>
          <h1 className="text-2xl font-bold text-slate-900">{user?.firstName} {user?.lastName}</h1>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left column */}
        <div className="flex-1 space-y-6">
          {/* Dashboard header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <RefreshCw size={12} />
                Last update: 1 minute ago
              </span>
            </div>
            <button className="btn-primary flex items-center gap-2">
              Manage Widgets
            </button>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Pending Invoices"
              value={stats?.invoices?.pending || 0}
              total={stats?.invoices?.total || 15}
              icon={FileText}
              color="bg-blue-500"
            />
            <StatCard
              label="Converted Leads"
              value={stats?.leads?.won || 0}
              total={stats?.leads?.total || 50}
              icon={ChevronRight}
              color="bg-teal-500"
            />
            <StatCard
              label="Projects In Progress"
              value={stats?.projects?.active || 0}
              total={stats?.projects?.total || 5}
              icon={FolderKanban}
              color="bg-green-500"
            />
            <StatCard
              label="Tasks Not Finished"
              value={stats?.tasks?.notStarted || 0}
              total={stats?.tasks?.total || 64}
              icon={CheckSquare}
              color="bg-red-400"
            />
          </div>

          {/* Task table */}
          <div className="card overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-slate-100 px-4">
              <div className="flex items-center gap-1">
                {['Tasks', 'Projects', 'Reminders', 'Tickets', 'Announcements', 'Latest Activity'].map((tab, i) => (
                  <button
                    key={tab}
                    className={clsx(
                      'px-3 py-3 text-sm font-medium border-b-2 transition-colors',
                      i === 0
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Table controls */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
              <div className="flex items-center gap-2">
                <select className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600">
                  <option>04</option>
                  <option>10</option>
                  <option>25</option>
                </select>
                <button className="btn-secondary py-1.5 text-xs">Export</button>
                <button className="p-1.5 text-slate-400 hover:text-slate-600">
                  <RefreshCw size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
                  <span className="text-slate-400 text-xs">Search...</span>
                  <kbd className="text-xs text-slate-400 bg-slate-200 px-1 rounded">⌘1</kbd>
                </div>
                <Link to="/tasks" className="text-xs text-primary-600 hover:text-primary-700 font-medium">See All</Link>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">#</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Name</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Start Date</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Priority</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Tags</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.slice(0, 4).map((task: any, i: number) => (
                    <TaskRow key={task.id} task={task} index={i} />
                  ))}
                  {tasks.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">No tasks yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment records chart */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Payment Records</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary-500 inline-block" />
                  <span className="text-xs text-slate-500">This Week Payments</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-400 inline-block" />
                  <span className="text-xs text-slate-500">Last Week Payments</span>
                </div>
                <button className="text-xs text-primary-600 font-medium">Full Report</button>
                <select className="text-xs border border-slate-200 rounded px-2 py-1">
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={paymentData}>
                <defs>
                  <linearGradient id="thisWeek" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lastWeek" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f472b6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="thisWeek" stroke="#0d9488" strokeWidth={2} fill="url(#thisWeek)" />
                <Area type="monotone" dataKey="lastWeek" stroke="#f472b6" strokeWidth={2} fill="url(#lastWeek)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right column */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {/* To-Do Items */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">To-Do items</h3>
              <button className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                <Plus size={13} />
                To-Do
              </button>
            </div>

            {/* Ongoing */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">All Ongoing To-Do Task</p>
              <div className="space-y-1">
                {ongoingTodos.map((todo: any) => (
                  <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} />
                ))}
                {ongoingTodos.length === 0 && (
                  <p className="text-xs text-slate-400 py-2">No ongoing tasks</p>
                )}
              </div>
            </div>

            {/* Completed */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">All Completed To-Do Task</p>
              <div className="space-y-1">
                {completedTodos.map((todo: any) => (
                  <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} />
                ))}
                {completedTodos.length === 0 && (
                  <p className="text-xs text-slate-400 py-2">No completed tasks</p>
                )}
              </div>
            </div>

            <button className="mt-4 w-full py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              View all items
            </button>
          </div>

          {/* Latest Project Activity */}
          <div className="card p-4">
            <h3 className="font-semibold text-slate-900 mb-4">Latest Project Activity</h3>
            <div className="space-y-3">
              {(data?.recentActivity || []).map((task: any) => (
                <div key={task.id} className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-semibold">
                      {task.assignedTo?.firstName?.[0]}{task.assignedTo?.lastName?.[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700">
                      {task.assignedTo?.firstName} {task.assignedTo?.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      Task Marked as {task.status?.replace(/_/g, ' ')}.
                    </p>
                    <p className="text-xs text-slate-400">
                      Project Name: {task.project?.name || 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
              {(data?.recentActivity || []).length === 0 && (
                <p className="text-xs text-slate-400">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
