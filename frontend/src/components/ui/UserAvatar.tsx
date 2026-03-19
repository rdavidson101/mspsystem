import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'

interface UserAvatarProps {
  user: {
    id?: string
    firstName?: string
    lastName?: string
    avatar?: string | null
    jobTitle?: string | null
    role?: string
  }
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  showHoverCard?: boolean
}

const SIZE_MAP = {
  xs: { outer: 'w-6 h-6', text: 'text-[9px]' },
  sm: { outer: 'w-7 h-7', text: 'text-[10px]' },
  md: { outer: 'w-8 h-8', text: 'text-xs' },
  lg: { outer: 'w-10 h-10', text: 'text-sm' },
}

function getInitials(firstName?: string, lastName?: string) {
  const f = firstName?.[0] ?? ''
  const l = lastName?.[0] ?? ''
  return (f + l).toUpperCase() || '?'
}

function getColor(name: string) {
  const colors = [
    'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function UserAvatar({ user, size = 'md', className = '', showHoverCard = true }: UserAvatarProps) {
  const [hovered, setHovered] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const { outer, text } = SIZE_MAP[size]
  const initials = getInitials(user.firstName, user.lastName)
  const colorClass = getColor((user.firstName ?? '') + (user.lastName ?? ''))
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown'

  function handleMouseEnter() {
    if (!showHoverCard) return
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX + rect.width / 2,
      })
    }
    setHovered(true)
  }

  return (
    <>
      <div
        ref={ref}
        className={`${outer} rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-white ${className} ${showHoverCard ? 'cursor-default' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHovered(false)}
      >
        {user.avatar ? (
          <img src={user.avatar} alt={fullName} className="w-full h-full object-cover" />
        ) : (
          <span className={`${colorClass} w-full h-full flex items-center justify-center ${text} font-bold text-white`}>
            {initials}
          </span>
        )}
      </div>

      {showHoverCard && hovered && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
        >
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-3 flex items-center gap-3 min-w-[160px] max-w-[220px]">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-slate-100">
              {user.avatar ? (
                <img src={user.avatar} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <span className={`${colorClass} w-full h-full flex items-center justify-center text-sm font-bold text-white`}>
                  {initials}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{fullName}</p>
              {user.jobTitle && (
                <p className="text-xs text-slate-500 truncate mt-0.5">{user.jobTitle}</p>
              )}
              {!user.jobTitle && user.role && (
                <p className="text-xs text-slate-400 truncate mt-0.5 capitalize">{user.role.toLowerCase()}</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
