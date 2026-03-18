import { Search, Share2, MessageSquare, ChevronDown, User, LogOut, Shield } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import NotificationBell from '@/components/ui/NotificationBell'
import { useState, useRef, useEffect } from 'react'

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

      {/* Search */}
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-64">
        <Search size={15} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-sm flex-1 outline-none text-slate-700 placeholder-slate-400"
        />
        <kbd className="text-xs text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">⌘1</kbd>
      </div>

      {/* Icons */}
      <div className="flex items-center gap-1">
        <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-500">
          <Share2 size={18} />
        </button>
        <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-500">
          <MessageSquare size={18} />
        </button>
        <NotificationBell />
      </div>

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
