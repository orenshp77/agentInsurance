'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Home, Users, FolderOpen, Bell, Settings, Plus, FileText } from 'lucide-react'
import { useState } from 'react'

export default function MobileNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const [showActions, setShowActions] = useState(false)

  if (!session?.user) return null

  const isAdmin = session.user.role === 'ADMIN'
  const isAgent = session.user.role === 'AGENT'
  const isClient = session.user.role === 'CLIENT'

  // Define navigation items based on role
  const getNavItems = () => {
    if (isAdmin) {
      return [
        { icon: Home, label: 'בית', path: '/dashboard' },
        { icon: Users, label: 'סוכנים', path: '/admin/agents' },
        { icon: Bell, label: 'התראות', path: '/dashboard' },
        { icon: Settings, label: 'הגדרות', path: '/settings' },
      ]
    }
    if (isAgent) {
      return [
        { icon: Home, label: 'בית', path: '/dashboard' },
        { icon: Users, label: 'לקוחות', path: '/agent/clients' },
        { icon: Bell, label: 'התראות', path: '/dashboard' },
        { icon: Settings, label: 'הגדרות', path: '/settings' },
      ]
    }
    // Client
    return [
      { icon: Home, label: 'בית', path: '/dashboard' },
      { icon: FolderOpen, label: 'תיקיות', path: '/client/folders' },
      { icon: Bell, label: 'התראות', path: '/dashboard' },
      { icon: Settings, label: 'הגדרות', path: '/settings' },
    ]
  }

  const navItems = getNavItems()

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  return (
    <>
      {/* Floating Action Button Menu */}
      {showActions && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowActions(false)}
        />
      )}

      {/* Quick Actions Popup */}
      {showActions && (isAgent || isAdmin) && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 md:hidden animate-scale-in">
          <div className="bg-[#0d1117] border-2 border-[#30363d] rounded-2xl p-4 flex gap-3 shadow-[0_8px_40px_rgba(0,0,0,0.8)]">
            {isAgent && (
              <>
                <button
                  onClick={() => {
                    router.push('/agent/clients?action=new')
                    setShowActions(false)
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary/20 hover:bg-primary/30 transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                    <Users size={24} className="text-white" />
                  </div>
                  <span className="text-xs text-foreground-muted">לקוח חדש</span>
                </button>
                <button
                  onClick={() => {
                    setShowActions(false)
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-accent/20 hover:bg-accent/30 transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
                    <FileText size={24} className="text-white" />
                  </div>
                  <span className="text-xs text-foreground-muted">קובץ חדש</span>
                </button>
              </>
            )}
            {isAdmin && (
              <button
                onClick={() => {
                  router.push('/admin/agents?action=new')
                  setShowActions(false)
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/20 hover:bg-secondary/30 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-secondary-dark flex items-center justify-center">
                  <Users size={24} className="text-white" />
                </div>
                <span className="text-xs text-foreground-muted">סוכן חדש</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="mx-4 mb-4">
          <div className="bg-[#0d1117] border-2 border-[#30363d] rounded-2xl px-2 py-2 flex items-center justify-around relative shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
            {/* Left Nav Items */}
            {navItems.slice(0, 2).map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                    active
                      ? 'bg-primary/20 text-primary'
                      : 'text-foreground-muted hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  <Icon size={22} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              )
            })}

            {/* Center Action Button */}
            {(isAgent || isAdmin) && (
              <button
                onClick={() => setShowActions(!showActions)}
                className={`relative -mt-8 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                  showActions
                    ? 'bg-gradient-to-br from-error to-tertiary rotate-45'
                    : 'bg-gradient-to-br from-primary to-accent'
                }`}
                style={{
                  boxShadow: showActions
                    ? '0 8px 30px rgba(239, 68, 68, 0.5)'
                    : '0 8px 30px rgba(59, 130, 246, 0.5)',
                }}
              >
                <Plus size={28} className="text-white" />
                {/* Glow ring */}
                <div
                  className={`absolute inset-0 rounded-full animate-ping opacity-30 ${
                    showActions ? 'bg-error' : 'bg-primary'
                  }`}
                  style={{ animationDuration: '2s' }}
                />
              </button>
            )}

            {/* Right Nav Items */}
            {navItems.slice(2).map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                    active
                      ? 'bg-primary/20 text-primary'
                      : 'text-foreground-muted hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  <Icon size={22} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Spacer for content */}
      <div className="h-24 md:hidden" />
    </>
  )
}
