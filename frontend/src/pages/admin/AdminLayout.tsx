import { NavLink, Outlet } from 'react-router-dom'
import { Users, Settings, Ticket, FolderKanban, Building2, Shield } from 'lucide-react'
import clsx from 'clsx'

const adminNav = [
  { label: 'User Management', href: '/admin/users', icon: Users },
  { label: 'Ticket Settings', href: '/admin/tickets', icon: Ticket },
  { label: 'Project Settings', href: '/admin/projects', icon: FolderKanban },
  { label: 'CRM Settings', href: '/admin/crm', icon: Building2 },
  { label: 'System Settings', href: '/admin/system', icon: Settings },
]

export default function AdminLayout() {
  return (
    <div className="flex gap-6 h-full">
      {/* Sub-nav */}
      <aside className="w-52 flex-shrink-0">
        <div className="flex items-center gap-2 mb-5">
          <Shield size={18} className="text-primary-500" />
          <h2 className="text-base font-bold text-slate-900">Administration</h2>
        </div>
        <nav className="space-y-1">
          {adminNav.map(item => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
