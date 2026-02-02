'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X, LogOut, User, Bell, Settings, UserPlus, FileText } from 'lucide-react'

interface Activity {
  id: string
  type: 'NEW_CLIENT' | 'NEW_FILE'
  title: string
  subtitle?: string
  link: string
  createdAt: string
}

export default function Header() {
  const { data: session } = useSession()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)

  useEffect(() => {
    if (session?.user && (session.user.role === 'ADMIN' || session.user.role === 'AGENT')) {
      fetchActivities()
    }
  }, [session])

  const fetchActivities = async () => {
    setLoadingActivities(true)
    try {
      const res = await fetch('/api/activity')
      if (res.ok) {
        const data = await res.json()
        setActivities(data)
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoadingActivities(false)
    }
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'עכשיו'
    if (diffMins < 60) return `לפני ${diffMins} דקות`
    if (diffHours < 24) return `לפני ${diffHours} שעות`
    return `לפני ${diffDays} ימים`
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'מנהל על'
      case 'AGENT': return 'סוכן'
      case 'CLIENT': return 'לקוח'
      default: return role
    }
  }

  const getRoleGradient = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'from-red-500 to-orange-500'
      case 'AGENT': return 'from-primary to-primary-dark'
      case 'CLIENT': return 'from-accent to-secondary'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  if (!session) return null

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Animated background gradient */}
      <div className="absolute inset-0 gradient-mesh opacity-50" />

      {/* Glass header */}
      <div className="relative glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo with animation */}
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => router.push('/dashboard')}
            >
              {/* Logo */}
              <div className="relative">
                <div className="w-14 h-14">
                  <img
                    src="/uploads/logo-finance.png"
                    alt="מגן פיננסי"
                    className="w-full h-full object-contain"
                  />
                </div>
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-white/10 rounded-full blur-2xl -z-10 opacity-50" />
              </div>

              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  מגן פיננסי
                </h1>
                <p className="text-xs text-foreground-muted">ניהול תיק חכם</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 rounded-xl hover:bg-white/5 transition-all relative group"
                >
                  <Bell size={20} className="text-foreground-muted group-hover:text-primary transition-colors" />
                  {/* Notification badge */}
                  {activities.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full animate-pulse" />
                  )}
                </button>

                {/* Notifications dropdown */}
                {notificationsOpen && (
                  <div className="absolute left-0 top-full mt-2 w-80 glass rounded-2xl p-4 animate-scale-in">
                    <h3 className="font-bold mb-3 text-sm">פעילות אחרונה</h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {loadingActivities ? (
                        <div className="text-center py-4 text-foreground-muted text-sm">טוען...</div>
                      ) : activities.length === 0 ? (
                        <div className="text-center py-4 text-foreground-muted text-sm">אין פעילות אחרונה</div>
                      ) : (
                        activities.map((activity) => (
                          <div
                            key={activity.id}
                            onClick={() => {
                              router.push(activity.link)
                              setNotificationsOpen(false)
                            }}
                            className={`p-3 rounded-xl bg-white/5 border border-transparent transition-all cursor-pointer group ${
                              activity.type === 'NEW_CLIENT'
                                ? 'hover:bg-primary/20 hover:border-primary/30'
                                : 'hover:bg-accent/20 hover:border-accent/30'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${
                                activity.type === 'NEW_CLIENT' ? 'bg-primary/20' : 'bg-accent/20'
                              }`}>
                                {activity.type === 'NEW_CLIENT' ? (
                                  <UserPlus size={16} className="text-primary" />
                                ) : (
                                  <FileText size={16} className="text-accent" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm truncate group-hover:${
                                  activity.type === 'NEW_CLIENT' ? 'text-primary' : 'text-accent'
                                } transition-colors`}>
                                  {activity.title}
                                </p>
                                {activity.subtitle && (
                                  <p className="text-xs text-foreground-muted truncate mt-0.5">
                                    {activity.subtitle}
                                  </p>
                                )}
                                <p className="text-xs text-foreground-muted mt-1">
                                  {formatTimeAgo(activity.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {activities.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <button
                          onClick={() => {
                            fetchActivities()
                          }}
                          className="w-full text-center text-sm text-primary hover:text-primary-hover transition-colors"
                        >
                          רענן פעילות
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User profile */}
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <p className="text-sm font-medium">{session.user.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${getRoleGradient(session.user.role)} text-white`}>
                    {getRoleLabel(session.user.role)}
                  </span>
                </div>

                {/* Avatar */}
                <div className="relative group">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center text-white font-bold">
                    {session.user.name?.charAt(0)}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-accent/30 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="p-2 rounded-xl hover:bg-error/10 text-foreground-muted hover:text-error transition-all"
              >
                <LogOut size={20} />
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-white/5 transition-all"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-[#0d1117] border-t border-[#30363d] animate-fade-in-up shadow-[0_8px_40px_rgba(0,0,0,0.8)]">
            <div className="p-4 space-y-4">
              {/* User info */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center text-white font-bold text-lg">
                  {session.user.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{session.user.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${getRoleGradient(session.user.role)} text-white`}>
                    {getRoleLabel(session.user.role)}
                  </span>
                </div>
              </div>

              {/* Menu items */}
              <div className="space-y-2">
                <button
                  onClick={() => { router.push('/dashboard'); setMenuOpen(false) }}
                  className="w-full p-3 rounded-xl hover:bg-white/5 transition-all flex items-center gap-3 text-right"
                >
                  <User size={20} className="text-primary" />
                  <span>דשבורד</span>
                </button>
                <button
                  onClick={() => { router.push('/settings'); setMenuOpen(false) }}
                  className="w-full p-3 rounded-xl hover:bg-white/5 transition-all flex items-center gap-3 text-right"
                >
                  <Settings size={20} className="text-accent" />
                  <span>הגדרות</span>
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full p-3 rounded-xl hover:bg-error/10 transition-all flex items-center gap-3 text-right text-error"
                >
                  <LogOut size={20} />
                  <span>התנתק</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
