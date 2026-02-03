'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Users, FolderOpen, FileText, TrendingUp, ArrowUpRight,
  Bell, Eye, Clock, Menu, LogOut, Home, Settings
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { AppLayout } from '@/components/layout'
import MobileNav from '@/components/layout/MobileNav'

interface Stats {
  users: number
  folders: number
  files: number
}

interface RecentFile {
  id: string
  fileName: string
  fileType: string
  createdAt: string
  folder: {
    name: string
    category: string
    user?: {
      name: string
      role: string
    }
  }
}

interface AgentInfo {
  id: string
  name: string
  logoUrl?: string
  phone?: string
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ users: 0, folders: 0, files: 0 })
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [agentLogo, setAgentLogo] = useState<string | null>(null)
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchStats()
      fetchRecentFiles()
      fetchAgentInfo()
    }
  }, [session])

  const fetchAgentInfo = async () => {
    try {
      // For agents - get their own logo
      if (session?.user?.role === 'AGENT') {
        const res = await fetch(`/api/users/${session.user.id}`)
        if (res.ok) {
          const data = await res.json()
          setAgentInfo(data)
          setAgentLogo(data.logoUrl)
        }
      }
      // For clients - get their agent's logo
      else if (session?.user?.role === 'CLIENT' && session.user.agentId) {
        const res = await fetch(`/api/users/${session.user.agentId}`)
        if (res.ok) {
          const data = await res.json()
          setAgentInfo(data)
          setAgentLogo(data.logoUrl)
        }
      }
    } catch (error) {
      console.error('Error fetching agent info:', error)
    }
  }

  const fetchStats = async () => {
    try {
      if (session?.user?.role !== 'CLIENT') {
        const usersRes = await fetch('/api/users')
        const usersData = await usersRes.json()
        setStats((prev) => ({ ...prev, users: usersData.length || 0 }))
      }

      const foldersRes = await fetch('/api/folders')
      const foldersData = await foldersRes.json()

      const totalFiles = foldersData.reduce(
        (acc: number, f: { _count?: { files: number } }) => acc + (f._count?.files || 0),
        0
      )
      setStats((prev) => ({
        ...prev,
        folders: foldersData.length || 0,
        files: totalFiles,
      }))
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentFiles = async () => {
    try {
      const res = await fetch('/api/files?limit=50&all=true')
      if (res.ok) {
        const data = await res.json()
        setRecentFiles(data)
      }
    } catch (error) {
      console.error('Error fetching recent files:', error)
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

  const isClient = session.user.role === 'CLIENT'
  const isAdmin = session.user.role === 'ADMIN'
  const isAgent = session.user.role === 'AGENT'

  return (
    <AppLayout showHeader={false} showFooter={false}>
      <div className={`min-h-screen overflow-x-hidden relative bg-mesh bg-grid ${isAdmin ? 'bg-[#0a1a0f]' : isAgent ? 'bg-[#050a14]' : 'bg-background'}`}>
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
        <header className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b ${isAdmin ? 'bg-[#0a1a0f]/90 border-emerald-500/20' : isAgent ? 'bg-[#050a14]/90 border-blue-500/20' : 'bg-background/90 border-white/10'}`}>
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
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-tertiary rounded-full animate-pulse" />
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
                        </div>
                        <div className="p-4 text-center text-foreground-muted">
                          אין התראות חדשות
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
                              router.push('/agent/clients')
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
                            router.push('/settings')
                            setShowMenu(false)
                          }}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-right ${isAdmin ? 'hover:bg-emerald-500/10' : isAgent ? 'hover:bg-blue-500/10' : 'hover:bg-white/10'}`}
                        >
                          <div className={`p-2 rounded-lg ${isAdmin ? 'bg-emerald-500/20' : isAgent ? 'bg-blue-500/20' : 'bg-primary/20'}`}>
                            <Settings size={18} className={isAdmin ? 'text-emerald-400' : isAgent ? 'text-blue-400' : 'text-primary'} />
                          </div>
                          <span>הגדרות</span>
                        </button>

                        <div className="my-2 h-px bg-white/10" />

                        <button
                          onClick={() => signOut({ callbackUrl: '/login' })}
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

        <div className="max-w-7xl mx-auto px-4 pt-24 pb-6 relative z-10">
          {/* Agent Logo Display - For Agents and Clients */}
          {agentLogo && !isAdmin && (
            <div className="flex flex-col items-center justify-center mb-8 animate-fade-in-up">
              <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-white/10 border-4 shadow-2xl mb-4 ${isAgent ? 'border-blue-500/30 shadow-blue-500/20' : 'border-primary/30 shadow-primary/20'}`}>
                <img
                  src={agentLogo}
                  alt={agentInfo?.name || 'לוגו'}
                  className="w-full h-full object-cover"
                />
              </div>
              {isClient && agentInfo && (
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
                שלום, <span className={isAdmin ? 'text-emerald-400' : isAgent ? 'text-blue-400' : 'text-gradient'}>{session.user.name}</span>
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
                  onClick={() => router.push('/admin/agents')}
                  className="glass-card p-4 md:p-6 rounded-2xl text-right hover:border-emerald-500/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <ArrowUpRight size={18} className="text-foreground-muted group-hover:text-emerald-400 transition-colors md:hidden" />
                    <ArrowUpRight size={20} className="text-foreground-muted group-hover:text-emerald-400 transition-colors hidden md:block" />
                    <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600">
                      <FolderOpen size={20} className="text-white md:hidden" />
                      <FolderOpen size={24} className="text-white hidden md:block" />
                    </div>
                  </div>
                  <h4 className="font-bold text-sm md:text-lg mb-1">צפה בתיקים</h4>
                  <p className="text-foreground-muted text-xs md:text-sm">כל התיקיות והמסמכים</p>
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
                onClick={() => router.push('/agent/clients')}
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
            </div>
          )}

          {/* Recent Activity - All System */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className={`w-1 h-5 rounded-full ${isAdmin ? 'bg-gradient-to-b from-emerald-500 to-green-600' : isAgent ? 'bg-gradient-to-b from-blue-500 to-indigo-600' : 'bg-gradient-to-b from-accent to-secondary'}`} />
                פעילות אחרונה במערכת
              </h2>
              <span className="text-xs text-foreground-muted">{recentFiles.length} פעולות</span>
            </div>

            <div className="glass-card rounded-2xl p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              {recentFiles.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText size={40} className="mx-auto text-foreground-subtle mb-3" />
                  <p className="text-foreground-muted">אין פעילות להצגה</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentFiles.map((file) => (
                    <div
                      key={file.id}
                      className="rounded-xl p-3 flex items-center gap-3 hover:bg-white/5 transition-all cursor-pointer"
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
                        <h4 className="font-medium text-sm truncate">{file.fileName}</h4>
                        <div className="flex items-center gap-2 text-xs text-foreground-subtle">
                          <span className="truncate">{file.folder?.name || 'תיקייה'}</span>
                          {file.folder?.user && (
                            <>
                              <span>•</span>
                              <span className="text-primary truncate">{file.folder.user.name}</span>
                            </>
                          )}
                        </div>
                      </div>
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
