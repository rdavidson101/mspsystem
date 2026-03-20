import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, TrendingUp, Receipt, FileText,
  FolderKanban, Ticket, Clock,
  ChevronDown, Building2, Shield, Package, GitMerge,
  Tag, Factory, ShoppingBag, Key, Send
} from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

function TriageBadge() {
  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets', 'AWAITING_TRIAGE'],
    queryFn: () => api.get('/tickets', { params: { status: 'AWAITING_TRIAGE' } }).then((r: any) => r.data),
    refetchInterval: 30000,
  })
  if (!tickets.length) return null
  return (
    <span className="ml-auto bg-violet-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
      {tickets.length}
    </span>
  )
}

type NavChild = { label: string; href: string }
type NavItemDef = { label: string; href?: string; icon: React.ElementType; children?: NavChild[] }

const allNav: NavItemDef[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', icon: Building2 },
  {
    label: 'Sales', icon: TrendingUp, children: [
      { label: 'Products', href: '/products' },
      { label: 'Leads', href: '/leads' },
      { label: 'Contracts', href: '/contracts' },
      { label: 'Invoices', href: '/invoices' },
    ]
  },
  { label: 'Expenses', href: '/expenses', icon: Receipt },
  {
    label: 'Projects', icon: FolderKanban, children: [
      { label: 'My Projects', href: '/projects/my' },
      { label: 'Portfolio Manager', href: '/projects/portfolio' },
      { label: 'Templates', href: '/projects/templates' },
    ]
  },
  {
    label: 'Inventory', icon: Package, children: [
      { label: 'Assets', href: '/inventory/assets' },
      { label: 'Asset Types', href: '/inventory/asset-types' },
      { label: 'Manufacturers', href: '/inventory/manufacturers' },
      { label: 'Vendors', href: '/inventory/vendors' },
      { label: 'Licenses', href: '/inventory/licenses' },
      { label: 'Shipments', href: '/inventory/shipments' },
    ]
  },
  { label: 'Tickets', icon: Ticket },
  {
    label: 'Changes', icon: GitMerge, children: [
      { label: 'All Changes', href: '/changes' },
      { label: 'My Approvals', href: '/changes/my-approvals' },
      { label: 'My Changes', href: '/changes/my-changes' },
    ]
  },
  { label: 'Time Tracking', href: '/time-tracking', icon: Clock },
  { label: 'Contacts', href: '/contacts', icon: Users },
  {
    label: 'Administration', icon: Shield, children: [
      { label: 'User Management', href: '/admin/users' },
      { label: 'Ticket Settings', href: '/admin/tickets' },
      { label: 'Project Settings', href: '/admin/projects' },
      { label: 'CRM Settings', href: '/admin/crm' },
      { label: 'System Settings', href: '/admin/system' },
    ]
  },
]

function NavItem({ item, open, onToggle }: { item: NavItemDef; open?: boolean; onToggle?: () => void }) {
  const location = useLocation()
  const hasChildren = !!item.children?.length

  const isChildActive = hasChildren
    ? item.children!.some(c => location.pathname === c.href || location.pathname.startsWith(c.href + '/'))
    : false

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => onToggle?.()}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
            'text-slate-300 hover:text-white hover:bg-sidebar-hover'
          )}
        >
          <item.icon size={18} className={isChildActive ? 'text-white' : ''} />
          <span className={clsx('flex-1 text-left', isChildActive && 'text-white font-medium')}>{item.label}</span>
          <ChevronDown size={14} className={clsx('transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="ml-8 mt-1 space-y-1">
            {item.children!.map(child => (
              <NavLink
                key={child.href}
                to={child.href}
                end
                className={({ isActive }) => clsx(
                  'flex items-center px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive ? 'text-white bg-sidebar-active' : 'text-slate-400 hover:text-white hover:bg-sidebar-hover'
                )}
              >
                <span className="flex-1">{child.label}</span>
                {child.href === '/triage' && <TriageBadge />}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={item.href!}
      end={item.href === '/projects'}
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
  const location = useLocation()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const { data: myTeams = [] } = useQuery({
    queryKey: ['my-teams'],
    queryFn: () => api.get('/auth/me/teams').then((r: any) => r.data),
  })

  const ticketsItem: NavItemDef = {
    label: 'Tickets',
    icon: Ticket,
    children: [
      { label: 'Triage Queue', href: '/triage' },
      { label: 'All Tickets', href: '/tickets' },
      { label: 'My Tickets', href: '/my-tickets' },
      { label: 'Search', href: '/tickets/search' },
      { label: 'Macros', href: '/macros' },
      ...myTeams.map((t: any) => ({ label: t.name, href: `/tickets/team/${t.id}` })),
    ],
  }

  const [openLabel, setOpenLabel] = useState<string | null>(() => {
    // Pre-open the group that has the active child
    const active = allNav.find(item =>
      item.children?.some(c => location.pathname.startsWith(c.href))
    )
    // Also check tickets paths
    if (!active && (location.pathname.startsWith('/tickets') || location.pathname.startsWith('/triage') || location.pathname.startsWith('/my-tickets') || location.pathname.startsWith('/macros'))) {
      return 'Tickets'
    }
    return active?.label || null
  })

  const visibleNav = allNav
    .map(item => item.label === 'Tickets' ? ticketsItem : item)
    .filter(item => item.label === 'Administration' ? isAdmin : true)

  return (
    <aside className="w-56 flex-shrink-0 bg-sidebar flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-white/10">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">M</span>
        </div>
        <span className="text-white font-semibold text-lg">MSP System</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleNav.map(item => (
          <NavItem
            key={item.label}
            item={item}
            open={item.children ? openLabel === item.label : undefined}
            onToggle={() => setOpenLabel(l => l === item.label ? null : item.label)}
          />
        ))}
      </nav>
    </aside>
  )
}
