'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { Home, Users, FolderOpen, Settings, BarChart3 } from 'lucide-react'

interface NavItem {
  icon: React.ElementType
  label: string
  path: string
  roles: string[]
}

const navItems: NavItem[] = [
  { icon: Home, label: 'ראשי', path: '/dashboard', roles: ['ADMIN', 'AGENT', 'CLIENT'] },
  { icon: Users, label: 'סוכנים', path: '/admin/agents', roles: ['ADMIN'] },
  { icon: Users, label: 'לקוחות', path: '/agent/clients', roles: ['ADMIN', 'AGENT'] },
  { icon: FolderOpen, label: 'תיקיות', path: '/client/folders', roles: ['CLIENT'] },
  { icon: BarChart3, label: 'סטטיסטיקה', path: '/stats', roles: ['ADMIN', 'AGENT'] },
]

export default function Footer() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  if (!session) return null

  const userNavItems = navItems.filter(item =>
    item.roles.includes(session.user.role)
  )

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Gradient border top */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

      {/* Glass footer */}
      <div className="glass">
        <nav className="max-w-lg mx-auto px-2 py-2">
          <div className="flex items-center justify-around">
            {userNavItems.slice(0, 5).map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.path || pathname.startsWith(item.path + '/')

              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`relative flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-300
                    ${isActive
                      ? 'text-primary'
                      : 'text-foreground-muted hover:text-foreground'
                    }`}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-primary to-accent rounded-full animate-scale-in" />
                  )}

                  {/* Icon container */}
                  <div className={`relative p-2 rounded-xl transition-all duration-300
                    ${isActive
                      ? 'bg-primary/10 scale-110'
                      : 'hover:bg-white/5'
                    }`}
                  >
                    <Icon size={22} className={isActive ? 'animate-bounce-soft' : ''} />

                    {/* Glow effect for active */}
                    {isActive && (
                      <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg" />
                    )}
                  </div>

                  {/* Label */}
                  <span className={`text-[10px] font-medium transition-all duration-300
                    ${isActive ? 'opacity-100' : 'opacity-70'}`}
                  >
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* Safe area for iOS */}
        <div className="h-safe-area-inset-bottom bg-background-secondary" />
      </div>
    </footer>
  )
}
