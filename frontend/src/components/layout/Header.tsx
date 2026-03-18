import { Search, Bell, Share2, MessageSquare, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function Header() {
  const { user, logout } = useAuthStore()

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
        <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>

      {/* User menu */}
      <button
        onClick={logout}
        className="flex items-center gap-2 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
      >
        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-semibold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </span>
        </div>
        <span className="text-sm font-medium text-slate-700">{user?.firstName}</span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>
    </header>
  )
}
