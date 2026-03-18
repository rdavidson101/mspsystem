import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, TrendingUp, Receipt, FileText,
  FolderKanban, CheckSquare, Ticket, Clock,
  Settings, HelpCircle, ChevronDown, Building2, Zap
} from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'

const mainNav = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', icon: Building2 },
  {
    label: 'Sales', icon: TrendingUp, children: [
      { label: 'Leads', href: '/leads' },
      { label: 'Contracts', href: '/contracts' },
      { label: 'Invoices', href: '/invoices' },
    ]
  },
  { label: 'Expenses', href: '/expenses', icon: Receipt },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Tickets', href: '/tickets', icon: Ticket },
  { label: 'Macros', href: '/macros', icon: Zap },
  { label: 'Time Tracking', href: '/time-tracking', icon: Clock },
  { label: 'Contacts', href: '/contacts', icon: Users },
]

const otherNav = [
  { label: 'Support', href: '#', icon: HelpCircle },
  { label: 'Settings', href: '/settings', icon: Settings },
]

interface NavItemProps {
  item: typeof mainNav[0]
}

function NavItem({ item }: NavItemProps) {
  const location = useLocation()
  const [open, setOpen] = useState(false)

  if ('children' in item && item.children) {
    const isActive = item.children.some(c => location.pathname.startsWith(c.href))
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
            isActive ? 'bg-sidebar-active text-white' : 'text-slate-300 hover:text-white hover:bg-sidebar-hover'
          )}
        >
          <item.icon size={18} />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown size={14} className={clsx('transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="ml-8 mt-1 space-y-1">
            {item.children.map(child => (
              <NavLink
                key={child.href}
                to={child.href}
                className={({ isActive }) => clsx(
                  'block px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive ? 'text-white bg-sidebar-active' : 'text-slate-400 hover:text-white hover:bg-sidebar-hover'
                )}
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={(item as any).href}
      className={({ isActive }) => clsx(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
        isActive ? 'bg-sidebar-active text-white' : 'text-slate-300 hover:text-white hover:bg-sidebar-hover'
      )}
    >
      <item.icon size={18} />
      <span>{item.label}</span>
    </NavLink>
  )
}

export default function Sidebar() {
  const { user } = useAuthStore()

  return (
    <aside className="w-56 flex-shrink-0 bg-sidebar flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-white/10">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">M</span>
        </div>
        <span className="text-white font-semibold text-lg">MSP System</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="text-slate-500 text-xs font-medium uppercase px-3 mb-2">Main</p>
        {mainNav.map(item => <NavItem key={item.label} item={item} />)}
        <p className="text-slate-500 text-xs font-medium uppercase px-3 mt-4 mb-2">Others</p>
        {otherNav.map(item => <NavItem key={item.label} item={item} />)}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="bg-sidebar-hover rounded-lg p-3">
          <p className="text-yellow-400 text-xs font-medium">Hey {user?.firstName},</p>
          <p className="text-slate-400 text-xs mt-1">You have 10 days left in your trial period.</p>
          <div className="mt-2 h-1.5 bg-slate-700 rounded-full">
            <div className="h-full w-1/3 bg-primary-500 rounded-full" />
          </div>
          <button className="mt-2 text-xs text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1">
            Upgrade plan →
          </button>
        </div>
      </div>
    </aside>
  )
}
