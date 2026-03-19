import { ChevronDown, User, LogOut, Shield, Clock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import NotificationBell from '@/components/ui/NotificationBell'
import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

function ActiveTimerIndicator() {
  const { data: timers = [] } = useQuery({
    queryKey: ['active-timers-header'],
    queryFn: () => api.get('/auth/me/timers').then(r => r.data),
    refetchInterval: 30000,
  })

  if (!timers.length) return null

  // Find the first timer that has a project
  const timerWithProject = timers.find((t: any) => t.task?.project)
  const projectName = timerWithProject?.task?.project?.name || timers[0]?.task?.title || 'a task'

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200"
      title={`Timer running on "${projectName}"`}
    >
      <Clock size={14} className="text-orange-500 animate-pulse" />
      <span className="text-xs font-semibold text-orange-600 hidden sm:block">
        Tracking: {projectName}
      </span>
    </div>
  )
}

export default function Header() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center px-6 gap-4 flex-shrink-0">
      <div className="flex-1" />

      {/* Active timer indicator */}
      <ActiveTimerIndicator />

      {/* Notifications */}
      <NotificationBell />

      {/* User menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex items-center gap-2 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
        >
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-semibold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <span className="text-sm font-medium text-slate-700">{user?.firstName}</span>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50">
            <div className="px-3 py-2 border-b border-slate-100 mb-1">
              <p className="text-xs font-semibold text-slate-800">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <User size={14} /> My Profile
            </Link>
            {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
              <Link
                to="/admin/users"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <Shield size={14} /> Administration
              </Link>
            )}
            <div className="border-t border-slate-100 mt-1 pt-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
