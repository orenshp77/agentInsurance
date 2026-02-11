'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Users, FolderOpen, FileText, TrendingUp, ArrowUpRight,
  Bell, Eye, Clock, Menu, LogOut, Home, Settings, AlertTriangle, LogIn, ArrowRight
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { AppLayout } from '@/components/layout'
import MobileNav from '@/components/layout/MobileNav'
import { useLogger } from '@/hooks/useLogger'
import { withFreshCacheBust } from '@/lib/utils'

interface Stats {
  users: number
  folders: number
  files: number
}

interface RecentFile {
  id: string
  fileName: string
  fileType: string
  fileUrl?: string
  createdAt: string
  folder: {
    id: string
    name: string
    category: string
    user?: {
      id: string
      name: string
      role: string
    }
  }
}

interface ActivityMetadata {
  fileUrl?: string
  folderId?: string
  folderName?: string
  clientId?: string
  clientName?: string
}

interface Activity {
  id: string
  type: string
  description: string
  userName?: string
  userRole?: string
  targetName?: string
  targetType?: string
  metadata?: string | ActivityMetadata
  createdAt: string
}

interface AgentInfo {
  id: string
  name: string
  logoUrl?: string
  phone?: string
}

interface ViewAsUser {
  id: string
  name: string
  email: string
  role: string
  logoUrl?: string
}

interface Notification {
  id: string
  title: string
  description: string
  type: string
  isRead: boolean
  forRole: string
  createdAt: string
}

export default function DashboardContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewAsId = searchParams.get('viewAs')
  const agentId = searchParams.get('agentId')
  const logger = useLogger('Dashboard')
  const [stats, setStats] = useState<Stats>({ users: 0, folders: 0, files: 0 })
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [agentLogo, setAgentLogo] = useState<string | null>(null)
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null)
  const [viewAsUser, setViewAsUser] = useState<ViewAsUser | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Fetch viewAs user info or agent info
  useEffect(() => {
    if (viewAsId && session?.user?.role === 'ADMIN') {
      fetchViewAsUser()
    }
    // When agentId is provided, fetch agent info directly
    if (agentId && session?.user?.role === 'ADMIN') {
      fetchAgentById(agentId)
    }
  }, [viewAsId, agentId, session])

  const fetchViewAsUser = async () => {
    try {
      const res = await fetch(`/api/users/${viewAsId}?_t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        setViewAsUser(data)
        // If viewing as agent, also get their logo
        if (data.role === 'AGENT' && data.logoUrl) {
          setAgentLogo(data.logoUrl)
          setAgentInfo(data)
        }
      }
    } catch (error) {
      logger.error('API_ERROR: Failed to fetch viewAs user', error instanceof Error ? error : undefined, { category: 'API_ERROR', viewAsId })
      console.error('Error fetching viewAs user:', error)
    }
  }

  const fetchAgentById = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}?_t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        if (data.role === 'AGENT') {
          setViewAsUser(data)
          setAgentLogo(data.logoUrl)
          setAgentInfo(data)
        }
      }
    } catch (error) {
      logger.error('API_ERROR: Failed to fetch agent', error instanceof Error ? error : undefined, { category: 'API_ERROR', agentId: id })
      console.error('Error fetching agent:', error)
    }
  }

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?_t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch (error) {
      logger.error('API_ERROR: Failed to fetch notifications', error instanceof Error ? error : undefined, { category: 'API_ERROR' })
      console.error('Error fetching notifications:', error)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    // Redirect new users (profile not completed) to settings page
    // Skip if justCompleted flag is present (just finished welcome flow) or sessionStorage indicates completed
    const justCompleted = searchParams.get('justCompleted') === 'true'
    const sessionStorageCompleted = typeof window !== 'undefined' && sessionStorage.getItem('profileCompleted') === 'true'
    if (status === 'authenticated' && session?.user && !session.user.profileCompleted && session.user.role !== 'ADMIN' && !justCompleted && !sessionStorageCompleted) {
      router.push('/settings?welcome=true')
      return
    }
    // Redirect clients to their folders page (unless admin viewing as client)
    if (status === 'authenticated' && session?.user?.role === 'CLIENT') {
      router.push('/client/folders')
    }
    // If admin is viewing as a client, redirect to client folders page
    if (status === 'authenticated' && session?.user?.role === 'ADMIN' && viewAsUser?.role === 'CLIENT') {
      router.push(`/client/folders?viewAs=${viewAsId}`)
    }
  }, [status, session, router, viewAsUser, viewAsId])

  useEffect(() => {
    if (session?.user) {
      logger.pageView('Dashboard', { role: session.user.role, viewAsId, agentId })
      fetchStats()
      fetchRecentFiles()
      fetchActivities()
      fetchAgentInfo()
      fetchNotifications()
    }
  }, [session, viewAsId, agentId])

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    if (!session?.user) return

    const interval = setInterval(() => {
      fetchStats()
      fetchRecentFiles()
      fetchActivities()
    }, 30000)

    return () => clearInterval(interval)
  }, [session, viewAsId, agentId])

  const fetchAgentInfo = async () => {
    try {
      // When admin views as agent, get that agent's info
      const targetAgentId = viewAsId || agentId
      if (targetAgentId && session?.user?.role === 'ADMIN') {
        const res = await fetch(`/api/users/${targetAgentId}?_t=${Date.now()}`)
        if (res.ok) {
          const data = await res.json()
          setAgentInfo(data)
          setAgentLogo(data.logoUrl)
        }
      }
      // For agents - get their own logo
      else if (session?.user?.role === 'AGENT') {
        const res = await fetch(`/api/users/${session.user.id}?_t=${Date.now()}`)
        if (res.ok) {
          const data = await res.json()
          setAgentInfo(data)
          setAgentLogo(data.logoUrl)
        }
      }
      // For clients - get their agent's logo
      else if (session?.user?.role === 'CLIENT' && session.user.agentId) {
        const res = await fetch(`/api/users/${session.user.agentId}?_t=${Date.now()}`)
        if (res.ok) {
          const data = await res.json()
          setAgentInfo(data)
          setAgentLogo(data.logoUrl)
        }
      }
    } catch (error) {
      logger.error('API_ERROR: Failed to fetch agent info', error instanceof Error ? error : undefined, { category: 'API_ERROR' })
      console.error('Error fetching agent info:', error)
    }
  }

  const fetchStats = async () => {
    try {
      // When admin views as agent, filter by that agent's ID
      const targetAgentId = viewAsId || agentId
      const agentParam = targetAgentId ? `&agentId=${targetAgentId}` : ''
      const timestamp = Date.now()

      if (session?.user?.role !== 'CLIENT') {
        // Admin sees AGENTS, Agent sees CLIENTS
        const roleToFetch = session?.user?.role === 'ADMIN' ? 'AGENT' : 'CLIENT'
        const usersRes = await fetch(`/api/users?role=${roleToFetch}${agentParam}&_t=${timestamp}`)
        const usersData = await usersRes.json()
        const users = Array.isArray(usersData) ? usersData : usersData.users || []
        setStats((prev) => ({ ...prev, users: users.length || 0 }))
      }

      const foldersRes = await fetch(`/api/folders?_t=${timestamp}${targetAgentId ? `&agentId=${targetAgentId}` : ''}`)
      const foldersData = await foldersRes.json()
      const folders = Array.isArray(foldersData) ? foldersData : foldersData.folders || []

      const totalFiles = folders.reduce(
        (acc: number, f: { _count?: { files: number } }) => acc + (f._count?.files || 0),
        0
      )
      setStats((prev) => ({
        ...prev,
        folders: folders.length || 0,
        files: totalFiles,
      }))
    } catch (error) {
      logger.error('API_ERROR: Failed to fetch stats', error instanceof Error ? error : undefined, { category: 'API_ERROR' })
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentFiles = async () => {
    try {
      const targetAgentId = viewAsId || agentId
      const agentParam = targetAgentId ? `&agentId=${targetAgentId}` : ''
      const res = await fetch(`/api/files?limit=50&all=true${agentParam}&_t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        setRecentFiles(data)
      }
    } catch (error) {
      logger.error('API_ERROR: Failed to fetch recent files', error instanceof Error ? error : undefined, { category: 'API_ERROR' })
      console.error('Error fetching recent files:', error)
    }
  }

  const fetchActivities = async () => {
    try {
      const targetAgentId = viewAsId || agentId
      const agentParam = targetAgentId ? `&agentId=${targetAgentId}` : ''
      const res = await fetch(`/api/activities?limit=20${agentParam}&_t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        setActivities(data)
      }
    } catch (error) {
      logger.error('API_ERROR: Failed to fetch activities', error instanceof Error ? error : undefined, { category: 'API_ERROR' })
      console.error('Error fetching activities:', error)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-mesh">
        <div className="text-center animate-fade-in">
          <div className="loading-spinner mx-auto mb-4" />
          <p className="text-foreground-muted">טוען...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'בוקר טוב'
    if (hour < 17) return 'צהריים טובים'
    if (hour < 21) return 'ערב טוב'
    return 'לילה טוב'
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

  // Use viewAs role if admin is impersonating
  const effectiveRole = viewAsUser?.role || session.user.role
  const effectiveName = viewAsUser?.name || session.user.name
  const isViewingAs = !!viewAsUser && session.user.role === 'ADMIN'

  const isClient = effectiveRole === 'CLIENT'
  const isAdmin = effectiveRole === 'ADMIN'
  const isAgent = effectiveRole === 'AGENT'

  return (
    <AppLayout showHeader={false} showFooter={false}>
      <div className={`min-h-screen overflow-x-hidden relative bg-mesh bg-grid ${isAdmin ? 'bg-[#0a1a0f]' : isAgent ? 'bg-[#050a14]' : 'bg-background'}`}>
        {/* Admin Viewing As Banner */}
        {isViewingAs && (
          <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-amber-500 to-orange-500 py-1 md:py-2 px-3 md:px-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 md:gap-4 text-black font-medium text-xs md:text-base min-w-0">
                <Eye size={14} className="shrink-0 md:w-[18px] md:h-[18px]" />
                <span className="truncate">צופים: {viewAsUser?.name}</span>
                <span className="text-xs bg-black/20 px-3 py-1 rounded-full hidden md:inline-block">את הפס הכתום רק אתם רואים</span>
              </div>
              <button
                onClick={() => router.push('/admin/agents')}
                className="flex items-center gap-1 md:gap-2 px-2.5 md:px-4 py-1 md:py-2 rounded-full bg-black/20 hover:bg-black/30 text-black font-medium transition-all text-xs md:text-sm shrink-0"
              >
                <ArrowRight size={12} className="md:w-4 md:h-4" />
                <span>חזור</span>
              </button>
            </div>
          </div>
        )}
        {/* Admin Green Glow Effects */}
        {isAdmin && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-emerald-500/50 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-green-500/45 rounded-full blur-[100px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-teal-500/35 rounded-full blur-[150px]" />
            <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-green-400/40 rounded-full blur-[80px]" />
            <div className="absolute bottom-1/4 left-1/4 w-[450px] h-[450px] bg-emerald-400/35 rounded-full blur-[90px]" />
          </div>
        )}

        {/* Agent Blue Glow Effects */}
        {isAgent && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-blue-600/40 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-blue-500/35 rounded-full blur-[100px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-indigo-500/30 rounded-full blur-[150px]" />
            <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-500/25 rounded-full blur-[80px]" />
            <div className="absolute bottom-1/4 left-1/4 w-[450px] h-[450px] bg-blue-400/30 rounded-full blur-[90px]" />
          </div>
        )}

        {/* Fixed Header with Hamburger Menu */}
        <header className={`fixed left-0 right-0 z-50 backdrop-blur-md border-b ${isViewingAs ? 'top-10' : 'top-0'} ${isAdmin ? 'bg-[#0a1a0f]/90 border-emerald-500/20' : isAgent ? 'bg-[#050a14]/90 border-blue-500/20' : 'bg-background/90 border-white/10'}`}>
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12">
                  <img
                    src="/uploads/logo-finance.png"
                    alt="מגן פיננסי"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="hidden sm:block">
                  <h1 className={`text-lg font-bold ${isAdmin ? 'text-emerald-400' : isAgent ? 'text-blue-400' : 'bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent'}`}>
                    מגן פיננסי
                  </h1>
                  <p className="text-xs text-foreground-muted">ניהול תיק חכם</p>
                </div>
              </div>

              {/* Right Side Controls */}
              <div className="flex items-center gap-3">
                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowNotifications(!showNotifications)
                      setShowMenu(false)
                    }}
                    className="relative p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <Bell size={20} className="text-foreground-muted" />
                    {notifications.some(n => !n.isRead) && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-tertiary rounded-full animate-pulse" />
                    )}
                  </button>

                  {showNotifications && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                      <div className={`absolute left-0 top-full mt-2 w-80 rounded-2xl p-4 z-50 shadow-[0_8px_40px_rgba(0,0,0,0.8)] ${isAdmin ? 'bg-[#0d1117] border-2 border-emerald-500/20' : isAgent ? 'bg-[#0d1117] border-2 border-blue-500/20' : 'bg-[#0d1117] border-2 border-[#30363d]'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-lg flex items-center gap-2">
                            <Bell size={18} className={isAdmin ? 'text-emerald-400' : isAgent ? 'text-blue-400' : 'text-primary'} />
                            התראות
                          </h3>
                          {notifications.filter(n => !n.isRead).length > 0 && (
                            <span className={`text-xs px-2 py-1 rounded-full ${isAdmin ? 'bg-emerald-500/20 text-emerald-400' : isAgent ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                              {notifications.filter(n => !n.isRead).length} חדשות
                            </span>
                          )}
                        </div>
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-4 text-center text-foreground-muted">
                              אין התראות חדשות
                            </div>
                          ) : (
                            notifications.map((notification) => (
                              <div
                                key={notification.id}
                                className={`p-3 rounded-xl transition-all cursor-pointer ${
                                  !notification.isRead
                                    ? isAdmin ? 'bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20' : isAgent ? 'bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20' : 'bg-primary/10 border border-primary/20 hover:bg-primary/20'
                                    : 'bg-white/5 hover:bg-white/10'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  {!notification.isRead && (
                                    <span className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${isAdmin ? 'bg-emerald-400' : isAgent ? 'bg-blue-400' : 'bg-primary'}`} />
                                  )}
                                  <div className={!notification.isRead ? '' : 'mr-5'}>
                                    <p className="font-medium text-sm">{notification.title}</p>
                                    <p className="text-xs text-foreground-muted mt-0.5">{notification.description}</p>
                                    <p className="text-xs text-foreground-muted/60 mt-1">{formatTimeAgo(notification.createdAt)}</p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Hamburger Menu Button */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowMenu(!showMenu)
                      setShowNotifications(false)
                    }}
                    className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold ${isAdmin ? 'bg-gradient-to-br from-emerald-500 to-green-600' : isAgent ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-primary to-accent'}`}>
                      {session.user.name?.charAt(0)}
                    </div>
                    <Menu size={20} className="text-foreground-muted" />
                  </button>

                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                      <div className={`absolute left-0 top-full mt-2 w-72 rounded-2xl p-4 z-50 shadow-[0_8px_40px_rgba(0,0,0,0.8)] ${isAdmin ? 'bg-[#0d1117] border-2 border-emerald-500/20' : isAgent ? 'bg-[#0d1117] border-2 border-blue-500/20' : 'bg-[#0d1117] border-2 border-[#30363d]'}`}>
                        {/* User Info */}
                        <div className={`flex items-center gap-3 p-3 rounded-xl mb-3 ${isAdmin ? 'bg-emerald-500/10' : isAgent ? 'bg-blue-500/10' : 'bg-white/5'}`}>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${isAdmin ? 'bg-gradient-to-br from-emerald-500 to-green-600' : isAgent ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-primary to-accent'}`}>
                            {session.user.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold">{session.user.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full text-white ${isAdmin ? 'bg-gradient-to-r from-emerald-500 to-green-600' : isAgent ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : isClient ? 'bg-gradient-to-r from-accent to-secondary' : 'bg-gradient-to-r from-primary to-accent'}`}>
                              {isAdmin ? 'מנהל ראשי' : isClient ? 'לקוח' : 'סוכן'}
                            </span>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <button
                          onClick={() => setShowMenu(false)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-right ${isAdmin ? 'bg-emerald-500/10' : isAgent ? 'bg-blue-500/10' : 'bg-primary/10'}`}
                        >
                          <div className={`p-2 rounded-lg ${isAdmin ? 'bg-emerald-500/20' : isAgent ? 'bg-blue-500/20' : 'bg-primary/20'}`}>
                            <Home size={18} className={isAdmin ? 'text-emerald-400' : isAgent ? 'text-blue-400' : 'text-primary'} />
                          </div>
                          <span>דשבורד</span>
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() => {
                              router.push('/admin/agents')
                              setShowMenu(false)
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all text-right"
                          >
                            <div className="p-2 rounded-lg bg-emerald-500/20">
                              <Users size={18} className="text-emerald-400" />
                            </div>
                            <span>ניהול סוכנים</span>
                          </button>
                        )}

                        {isAgent && (
                          <button
                            onClick={() => {
                              router.push(viewAsId ? `/agent/clients?viewAs=${viewAsId}` : '/agent/clients')
                              setShowMenu(false)
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-500/10 transition-all text-right"
                          >
                            <div className="p-2 rounded-lg bg-blue-500/20">
                              <Users size={18} className="text-blue-400" />
                            </div>
                            <span>ניהול לקוחות</span>
                          </button>
                        )}

                        {isClient && (
                          <button
                            onClick={() => {
                              router.push('/client/folders')
                              setShowMenu(false)
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all text-right"
                          >
                            <div className="p-2 rounded-lg bg-accent/20">
                              <FolderOpen size={18} className="text-accent" />
                            </div>
                            <span>התיקיות שלי</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            const targetId = viewAsId || agentId
                            router.push(isViewingAs && targetId ? `/settings?viewAs=${targetId}` : '/settings')
                            setShowMenu(false)
                          }}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-right ${isAdmin ? 'hover:bg-emerald-500/10' : isAgent ? 'hover:bg-blue-500/10' : 'hover:bg-white/10'}`}
                        >
                          <div className={`p-2 rounded-lg ${isAdmin ? 'bg-emerald-500/20' : isAgent ? 'bg-blue-500/20' : 'bg-primary/20'}`}>
                            <Settings size={18} className={isAdmin ? 'text-emerald-400' : isAgent ? 'text-blue-400' : 'text-primary'} />
                          </div>
                          <span>הגדרות</span>
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() => {
                              router.push('/admin/logs')
                              setShowMenu(false)
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-orange-500/10 transition-all text-right"
                          >
                            <div className="p-2 rounded-lg bg-orange-500/20">
                              <AlertTriangle size={18} className="text-orange-400" />
                            </div>
                            <span>לוגים ותקלות</span>
                          </button>
                        )}

                        <div className="my-2 h-px bg-white/10" />

                        <button
                          onClick={() => { logger.info('AUTH: User signing out', { category: 'AUTH' }); signOut({ callbackUrl: '/login' }) }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-error/10 transition-all text-right text-error"
                        >
                          <div className="p-2 rounded-lg bg-error/20">
                            <LogOut size={18} />
                          </div>
                          <span>התנתק</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Blobs for decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
          <div className="blob-1 -top-40 -right-40" />
          <div className="blob-2 top-1/2 -left-60" />
        </div>

        <div className={`max-w-7xl mx-auto px-4 pb-6 relative z-10 ${isViewingAs ? 'pt-32' : 'pt-24'}`}>
          {/* Agent Logo Display - For Agents and Clients */}
          {isAgent && (
            <div className="flex flex-col items-center justify-center mb-8 animate-fade-in-up">
              <div
                onClick={!agentLogo ? () => {
                  const targetId = viewAsId || agentId
                  router.push(isViewingAs && targetId ? `/settings?viewAs=${targetId}` : '/settings')
                } : undefined}
                className={`w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-white/10 border-4 shadow-2xl mb-4 border-blue-500/30 shadow-blue-500/20 ${!agentLogo ? 'cursor-pointer hover:scale-105' : ''} transition-transform ${!agentLogo ? 'flex items-center justify-center' : ''}`}
                title={!agentLogo ? 'לחץ להעלאת לוגו' : undefined}
              >
                {agentLogo ? (
                  <img
                    src={withFreshCacheBust(agentLogo)}
                    alt={agentInfo?.name || 'לוגו'}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                      <Users size={32} className="text-blue-400" />
                    </div>
                    <span className="text-xs text-blue-400">לחץ להעלאת לוגו</span>
                  </div>
                )}
              </div>
            </div>
          )}
          {isClient && (
            <div className="flex flex-col items-center justify-center mb-8 animate-fade-in-up">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-white/10 border-4 shadow-2xl mb-4 border-primary/30 shadow-primary/20 flex items-center justify-center">
                <img
                  src={withFreshCacheBust(agentLogo || '/uploads/logo-finance.png')}
                  alt={agentInfo?.name || 'מגן פיננסי'}
                  className="w-full h-full object-contain"
                />
              </div>
              {agentInfo && (
                <div className="text-center">
                  <p className="text-foreground-muted text-sm">הסוכן שלך</p>
                  <p className="text-xl font-bold text-gradient">{agentInfo.name}</p>
                </div>
              )}
            </div>
          )}

          {/* Header Section */}
          <div className="flex items-start justify-between mb-8 animate-fade-in-up">
            <div>
              <p className="text-foreground-muted text-sm mb-1">{getGreeting()} 👋</p>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                שלום, <span className={isAdmin ? 'text-emerald-400' : isAgent ? 'text-blue-400' : 'text-gradient'}>{effectiveName}</span>
              </h1>
              <p className="text-foreground-subtle text-sm">מה נעשה היום?</p>
            </div>
          </div>

          {/* Summary Card - Client View */}
          {isClient && (
            <div className="glass-card rounded-3xl p-6 mb-8 animate-fade-in-up overflow-hidden relative">
              {/* Decorative gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-transparent to-accent/10" />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-foreground-subtle text-sm">סיכום התיק שלי</span>
                  <div className="badge badge-primary">פעיל</div>
                </div>

                <div className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                  {stats.files}
                  <span className="text-lg text-foreground-muted mr-2">מסמכים</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-foreground-subtle text-xs mb-1">תיקיות</p>
                    <p className="text-xl font-bold text-primary">{stats.folders}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-foreground-subtle text-xs mb-1">עדכון אחרון</p>
                    <p className="text-xl font-bold text-accent">היום</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Row - Non-Client */}
          {!isClient && (
            <div className="grid grid-cols-3 gap-3 md:gap-6 mb-8 animate-fade-in-up">
              <div className="glass-card rounded-2xl p-4 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 md:p-3 rounded-xl ${isAdmin ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5' : 'bg-gradient-to-br from-blue-500/20 to-blue-500/5'}`}>
                    <Users size={20} className={isAdmin ? 'text-emerald-400' : 'text-blue-400'} />
                  </div>
                  <span className="text-success text-xs flex items-center gap-1">
                    <TrendingUp size={12} />
                    +12%
                  </span>
                </div>
                <div className="text-2xl md:text-3xl font-bold text-foreground">{stats.users}</div>
                <div className="text-foreground-subtle text-xs md:text-sm">
                  {session.user.role === 'ADMIN' ? 'סוכנים' : 'לקוחות'}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-4 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 md:p-3 rounded-xl ${isAdmin ? 'bg-gradient-to-br from-green-500/20 to-green-500/5' : 'bg-gradient-to-br from-indigo-500/20 to-indigo-500/5'}`}>
                    <FolderOpen size={20} className={isAdmin ? 'text-green-400' : 'text-indigo-400'} />
                  </div>
                  <span className="text-success text-xs flex items-center gap-1">
                    <TrendingUp size={12} />
                    +8%
                  </span>
                </div>
                <div className="text-2xl md:text-3xl font-bold text-foreground">{stats.folders}</div>
                <div className="text-foreground-subtle text-xs md:text-sm">תיקיות</div>
              </div>

              <div className="glass-card rounded-2xl p-4 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 md:p-3 rounded-xl ${isAdmin ? 'bg-gradient-to-br from-teal-500/20 to-teal-500/5' : 'bg-gradient-to-br from-cyan-500/20 to-cyan-500/5'}`}>
                    <FileText size={20} className={isAdmin ? 'text-teal-400' : 'text-cyan-400'} />
                  </div>
                  <span className="text-success text-xs flex items-center gap-1">
                    <TrendingUp size={12} />
                    +24%
                  </span>
                </div>
                <div className="text-2xl md:text-3xl font-bold text-foreground">{stats.files}</div>
                <div className="text-foreground-subtle text-xs md:text-sm">קבצים</div>
              </div>
            </div>
          )}

          {/* Quick Actions - Admin Only (two buttons) */}
          {isAdmin && (
            <div className="mb-8">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <span className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-green-600 rounded-full" />
                פעולות מהירות
              </h2>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <button
                  onClick={() => router.push('/admin/agents')}
                  className="glass-card p-4 md:p-6 rounded-2xl text-right hover:border-emerald-500/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <ArrowUpRight size={18} className="text-foreground-muted group-hover:text-emerald-400 transition-colors md:hidden" />
                    <ArrowUpRight size={20} className="text-foreground-muted group-hover:text-emerald-400 transition-colors hidden md:block" />
                    <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600">
                      <Users size={20} className="text-white md:hidden" />
                      <Users size={24} className="text-white hidden md:block" />
                    </div>
                  </div>
                  <h4 className="font-bold text-sm md:text-lg mb-1">ניהול סוכנים</h4>
                  <p className="text-foreground-muted text-xs md:text-sm">הוסף, ערוך ונהל</p>
                </button>

                <button
                  onClick={() => router.push('/admin/logs')}
                  className="glass-card p-4 md:p-6 rounded-2xl text-right hover:border-orange-500/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <ArrowUpRight size={18} className="text-foreground-muted group-hover:text-orange-400 transition-colors md:hidden" />
                    <ArrowUpRight size={20} className="text-foreground-muted group-hover:text-orange-400 transition-colors hidden md:block" />
                    <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600">
                      <AlertTriangle size={20} className="text-white md:hidden" />
                      <AlertTriangle size={24} className="text-white hidden md:block" />
                    </div>
                  </div>
                  <h4 className="font-bold text-sm md:text-lg mb-1">לוגים ותקלות</h4>
                  <p className="text-foreground-muted text-xs md:text-sm">מעקב שגיאות</p>
                </button>
              </div>
            </div>
          )}

          {/* Quick Action - Agent Only (single central button) */}
          {isAgent && (
            <div className="mb-8">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <span className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full" />
                פעולות מהירות
              </h2>

              <button
                onClick={() => router.push(viewAsId ? `/agent/clients?viewAs=${viewAsId}` : '/agent/clients')}
                className="w-full glass-card p-6 md:p-8 rounded-2xl text-right hover:border-blue-500/30 transition-all group"
              >
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600">
                    <Users size={32} className="text-white md:hidden" />
                    <Users size={40} className="text-white hidden md:block" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg md:text-xl mb-1 text-white">ניהול לקוחות</h4>
                    <p className="text-foreground-muted text-sm md:text-base">צפה בכל הלקוחות שלך, ערוך פרטים ונהל תיקים</p>
                  </div>
                  <ArrowUpRight size={24} className="text-foreground-muted group-hover:text-blue-400 transition-colors md:hidden" />
                  <ArrowUpRight size={28} className="text-foreground-muted group-hover:text-blue-400 transition-colors hidden md:block" />
                </div>
              </button>

              {/* Upload Files Block */}
              <div className="mt-4 glass-card p-6 rounded-2xl">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-blue-400" />
                  העלאת טפסים ללקוחות
                </h3>
                <p className="text-foreground-muted text-sm mb-4">בחר קטגוריה להעלאת מסמכים</p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => router.push(viewAsId ? `/agent/upload/insurance?viewAs=${viewAsId}` : '/agent/upload/insurance')}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 hover:from-blue-500/30 hover:to-blue-600/20 transition-all group"
                  >
                    <div className="p-3 rounded-xl bg-blue-500">
                      <FileText size={24} className="text-white" />
                    </div>
                    <span className="text-sm font-medium text-blue-400">ביטוח</span>
                  </button>
                  <button
                    onClick={() => router.push(viewAsId ? `/agent/upload/finance?viewAs=${viewAsId}` : '/agent/upload/finance')}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 hover:from-purple-500/30 hover:to-purple-600/20 transition-all group"
                  >
                    <div className="p-3 rounded-xl bg-purple-500">
                      <FileText size={24} className="text-white" />
                    </div>
                    <span className="text-sm font-medium text-purple-400">פיננסים</span>
                  </button>
                  <button
                    onClick={() => router.push(viewAsId ? `/agent/upload/car?viewAs=${viewAsId}` : '/agent/upload/car')}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 hover:from-emerald-500/30 hover:to-emerald-600/20 transition-all group"
                  >
                    <div className="p-3 rounded-xl bg-emerald-500">
                      <FileText size={24} className="text-white" />
                    </div>
                    <span className="text-sm font-medium text-emerald-400">רכב</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity - All System */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className={`w-1 h-5 rounded-full ${isAdmin ? 'bg-gradient-to-b from-emerald-500 to-green-600' : isAgent ? 'bg-gradient-to-b from-blue-500 to-indigo-600' : 'bg-gradient-to-b from-accent to-secondary'}`} />
                פעילות אחרונה במערכת
              </h2>
              <span className="text-xs text-foreground-muted">{activities.length + recentFiles.length} פעולות</span>
            </div>

            <div className="glass-card rounded-2xl p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {activities.length === 0 && recentFiles.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText size={40} className="mx-auto text-foreground-subtle mb-3" />
                  <p className="text-foreground-muted">אין פעילות להצגה</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Activities (registrations, etc.) */}
                  {activities.map((activity) => {
                    // Parse metadata if it's a string
                    const metadata: ActivityMetadata = activity.metadata
                      ? (typeof activity.metadata === 'string' ? JSON.parse(activity.metadata) : activity.metadata)
                      : {}

                    return (
                      <div
                        key={activity.id}
                        className="rounded-xl p-3 flex items-center gap-3 hover:bg-white/5 transition-all"
                      >
                        <div className={`p-2 rounded-lg ${
                          activity.type === 'LOGIN'
                            ? activity.userRole === 'ADMIN'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : activity.userRole === 'AGENT'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-purple-500/20 text-purple-400'
                            : activity.type === 'USER_REGISTERED'
                              ? activity.userRole === 'AGENT'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-green-500/20 text-green-400'
                              : activity.type === 'FILE_UPLOADED'
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {activity.type === 'LOGIN' ? <LogIn size={16} /> :
                           activity.type === 'FILE_UPLOADED' ? <FileText size={16} /> : <Users size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          {activity.type === 'FILE_UPLOADED' && metadata.fileUrl ? (
                            <a
                              href={metadata.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-sm truncate block hover:text-primary transition-colors cursor-pointer"
                            >
                              {activity.description}
                            </a>
                          ) : (
                            <h4 className="font-medium text-sm truncate">{activity.description}</h4>
                          )}
                          <div className="flex items-center gap-2 text-xs text-foreground-subtle">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              activity.userRole === 'AGENT'
                                ? 'bg-blue-500/20 text-blue-400'
                                : activity.userRole === 'ADMIN'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              {activity.userRole === 'AGENT' ? 'סוכן' : activity.userRole === 'ADMIN' ? 'מנהל' : 'לקוח'}
                            </span>
                          </div>
                        </div>
                        {/* Show client name for file uploads */}
                        {activity.type === 'FILE_UPLOADED' && metadata.clientName && (
                          <button
                            onClick={() => router.push(`/agent/clients/${metadata.clientId}/folders/${metadata.folderId}${viewAsId ? `?viewAs=${viewAsId}` : ''}`)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors flex-shrink-0"
                          >
                            <span className="text-primary text-xs font-medium truncate max-w-[100px]">
                              {metadata.clientName}
                            </span>
                          </button>
                        )}
                        <div className="text-left flex-shrink-0">
                          <span className="text-foreground-subtle text-xs flex items-center gap-1">
                            <Clock size={10} />
                            {formatTimeAgo(activity.createdAt)}
                          </span>
                        </div>
                      </div>
                    )
                  })}

                  {/* Recent Files */}
                  {recentFiles.map((file) => (
                    <div
                      key={file.id}
                      className="rounded-xl p-3 flex items-center gap-3 hover:bg-white/5 transition-all"
                    >
                      <div className={`p-2 rounded-lg ${
                        file.fileType === 'PDF'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {file.fileType === 'PDF' ? (
                          <FileText size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {file.fileUrl ? (
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-sm truncate block hover:text-primary transition-colors cursor-pointer"
                          >
                            {file.fileName}
                          </a>
                        ) : (
                          <h4 className="font-medium text-sm truncate">{file.fileName}</h4>
                        )}
                        <div className="flex items-center gap-2 text-xs text-foreground-subtle">
                          <span className="truncate">{file.folder?.name || 'תיקייה'}</span>
                        </div>
                      </div>
                      {file.folder?.user && (
                        <button
                          onClick={() => router.push(`/agent/clients/${file.folder.user?.id}/folders/${file.folder.id}${viewAsId ? `?viewAs=${viewAsId}` : ''}`)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors flex-shrink-0"
                        >
                          <span className="text-primary text-xs font-medium truncate max-w-[100px]">
                            {file.folder.user.name}
                          </span>
                        </button>
                      )}
                      <div className="text-left flex-shrink-0">
                        <span className="text-foreground-subtle text-xs flex items-center gap-1">
                          <Clock size={10} />
                          {formatTimeAgo(file.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom spacing for mobile nav */}
          <div className="h-32 md:h-8" />
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </AppLayout>
  )
}
