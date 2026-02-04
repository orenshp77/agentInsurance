'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  XCircle,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Smartphone,
  Monitor,
  Tablet,
  Filter,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Menu,
  Bell,
  Home,
  Users,
  Settings,
  LogOut
} from 'lucide-react'
import { AppLayout } from '@/components/layout'
import Button from '@/components/ui/Button'
import MobileNav from '@/components/layout/MobileNav'
import { showSuccess, showError, showConfirm } from '@/lib/swal'

interface DeviceInfo {
  userAgent?: string
  platform?: string
  language?: string
  screenWidth?: number
  screenHeight?: number
  deviceType?: 'mobile' | 'tablet' | 'desktop'
  browser?: string
  browserVersion?: string
  os?: string
  osVersion?: string
  isTouchDevice?: boolean
}

interface LogMetadata {
  componentName?: string
  userId?: string
  deviceInfo?: DeviceInfo
  url?: string
  [key: string]: unknown
}

interface Log {
  id: string
  message: string
  errorLevel: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  aiFix: string | null
  metadata: LogMetadata | null
  createdAt: string
}

const levelConfig = {
  INFO: {
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    label: 'מידע',
  },
  WARNING: {
    icon: AlertTriangle,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    label: 'אזהרה',
  },
  ERROR: {
    icon: AlertCircle,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    label: 'שגיאה',
  },
  CRITICAL: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    label: 'קריטי',
  },
}

const deviceIcons = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
}

export default function AdminLogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [filterLevel, setFilterLevel] = useState<string>('')
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [showMenu, setShowMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const limit = 20

  useEffect(() => {
    if (status === 'loading') return // Wait for session to load
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      fetchLogs()
    }
  }, [filterLevel, page, status, session])

  // Auto-refresh logs every 5 seconds
  useEffect(() => {
    if (status !== 'authenticated' || session?.user?.role !== 'ADMIN') return

    const interval = setInterval(() => {
      fetchLogs()
    }, 5000)

    return () => clearInterval(interval)
  }, [filterLevel, page, status, session])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterLevel) params.set('level', filterLevel)
      params.set('limit', limit.toString())
      params.set('offset', (page * limit).toString())

      const res = await fetch(`/api/logs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch logs')

      const data = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
    } catch (error) {
      showError('שגיאה בטעינת הלוגים')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteOldLogs = async () => {
    const confirmed = await showConfirm(
      'מחיקת לוגים ישנים',
      'האם אתה בטוח שברצונך למחוק לוגים ישנים מעל 30 יום?'
    )

    if (!confirmed) return

    try {
      const res = await fetch('/api/logs?daysOld=30', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete logs')

      const data = await res.json()
      showSuccess(`נמחקו ${data.deleted} לוגים`)
      fetchLogs()
    } catch (error) {
      showError('שגיאה במחיקת הלוגים')
    }
  }

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedLogs(newExpanded)
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
      showSuccess('הועתק ללוח!')
    } catch {
      showError('שגיאה בהעתקה')
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalPages = Math.ceil(total / limit)

  if (status === 'loading') {
    return (
      <AppLayout showHeader={false} showFooter={false}>
        <div className="min-h-screen flex items-center justify-center bg-[#0a1a0f]">
          <div className="text-center animate-fade-in">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-foreground-muted">טוען...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
    return null // Will redirect in useEffect
  }

  if (loading) {
    return (
      <AppLayout showHeader={false} showFooter={false}>
        <div className="min-h-screen flex items-center justify-center bg-[#0a1a0f]">
          <div className="text-center animate-fade-in">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-foreground-muted">טוען...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout showHeader={false} showFooter={false}>
      <div className="min-h-screen overflow-x-hidden relative bg-mesh bg-grid bg-[#0a1a0f]">
        {/* Admin Green Glow Effects - Subtle */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-green-500/12 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[150px]" />
        </div>

        {/* Fixed Header with Hamburger Menu */}
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b bg-[#0a1a0f]/90 border-emerald-500/20">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => router.push('/dashboard')}
              >
                <div className="w-12 h-12">
                  <img
                    src="/uploads/logo-finance.png"
                    alt="מגן פיננסי"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-emerald-400">
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
                  </button>

                  {showNotifications && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                      <div className="absolute left-0 top-full mt-2 w-80 rounded-2xl p-4 z-50 shadow-[0_8px_40px_rgba(0,0,0,0.8)] bg-[#0d1117] border-2 border-emerald-500/20">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-lg flex items-center gap-2">
                            <Bell size={18} className="text-emerald-400" />
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
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-emerald-500 to-green-600">
                      {session?.user?.name?.charAt(0)}
                    </div>
                    <Menu size={20} className="text-foreground-muted" />
                  </button>

                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                      <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl p-4 z-50 shadow-[0_8px_40px_rgba(0,0,0,0.8)] bg-[#0d1117] border-2 border-emerald-500/20">
                        {/* User Info */}
                        <div className="flex items-center gap-3 p-3 rounded-xl mb-3 bg-emerald-500/10">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br from-emerald-500 to-green-600">
                            {session?.user?.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold">{session?.user?.name}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full text-white bg-gradient-to-r from-emerald-500 to-green-600">
                              מנהל ראשי
                            </span>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <button
                          onClick={() => {
                            router.push('/dashboard')
                            setShowMenu(false)
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-500/10 transition-all text-right"
                        >
                          <div className="p-2 rounded-lg bg-emerald-500/20">
                            <Home size={18} className="text-emerald-400" />
                          </div>
                          <span>דשבורד</span>
                        </button>

                        <button
                          onClick={() => {
                            router.push('/admin/agents')
                            setShowMenu(false)
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-500/10 transition-all text-right"
                        >
                          <div className="p-2 rounded-lg bg-emerald-500/20">
                            <Users size={18} className="text-emerald-400" />
                          </div>
                          <span>ניהול סוכנים</span>
                        </button>

                        <button
                          onClick={() => setShowMenu(false)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 transition-all text-right"
                        >
                          <div className="p-2 rounded-lg bg-orange-500/20">
                            <AlertTriangle size={18} className="text-orange-400" />
                          </div>
                          <span>לוגים ותקלות</span>
                        </button>

                        <button
                          onClick={() => {
                            router.push('/settings')
                            setShowMenu(false)
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-500/10 transition-all text-right"
                        >
                          <div className="p-2 rounded-lg bg-emerald-500/20">
                            <Settings size={18} className="text-emerald-400" />
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

        <div className="max-w-7xl mx-auto px-4 pt-24 pb-6 relative z-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">📊 מערכת לוגים</h1>
              <p className="text-foreground-muted mt-1">מעקב אחר תקלות ושגיאות במערכת</p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={fetchLogs}
                className="flex items-center gap-2"
              >
                <RefreshCw size={18} />
                רענן
              </Button>
              <Button
                variant="secondary"
                onClick={handleDeleteOldLogs}
                className="flex items-center gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
              >
                <Trash2 size={18} />
                מחק ישנים
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {(['INFO', 'WARNING', 'ERROR', 'CRITICAL'] as const).map((level) => {
              const config = levelConfig[level]
              const Icon = config.icon
              const count = logs.filter(l => l.errorLevel === level).length

              return (
                <button
                  key={level}
                  onClick={() => setFilterLevel(filterLevel === level ? '' : level)}
                  className={`p-4 rounded-xl border transition-all ${
                    filterLevel === level
                      ? `${config.bg} ${config.border} ring-2 ring-offset-2 ring-offset-[#0a1a0f] ring-current`
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.bg}`}>
                      <Icon size={20} className={config.color} />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">{count}</div>
                      <div className="text-sm text-foreground-muted">{config.label}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2 text-foreground-muted">
              <Filter size={18} />
              <span>סינון:</span>
            </div>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">הכל</option>
              <option value="INFO">מידע</option>
              <option value="WARNING">אזהרה</option>
              <option value="ERROR">שגיאה</option>
              <option value="CRITICAL">קריטי</option>
            </select>
            <div className="text-foreground-muted">
              סה&quot;כ: {total} לוגים
            </div>
          </div>

          {/* Logs List */}
          <div className="space-y-4">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-foreground-muted">
                <Info size={48} className="mx-auto mb-4 opacity-50" />
                <p>אין לוגים להצגה</p>
              </div>
            ) : (
              logs.map((log) => {
                const config = levelConfig[log.errorLevel]
                const Icon = config.icon
                const isExpanded = expandedLogs.has(log.id)
                const deviceType = log.metadata?.deviceInfo?.deviceType || 'desktop'
                const DeviceIcon = deviceIcons[deviceType]

                return (
                  <div
                    key={log.id}
                    className={`rounded-xl border ${config.border} ${config.bg} overflow-hidden`}
                  >
                    {/* Log Header */}
                    <button
                      onClick={() => toggleExpand(log.id)}
                      className="w-full p-4 flex items-start gap-4 text-right hover:bg-white/5 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${config.bg} shrink-0`}>
                        <Icon size={20} className={config.color} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color} font-medium`}>
                            {config.label}
                          </span>
                          <span className="text-xs text-foreground-muted">
                            {formatDate(log.createdAt)}
                          </span>
                          {log.metadata?.deviceInfo && (
                            <div className="flex items-center gap-1 text-xs text-foreground-muted">
                              <DeviceIcon size={14} />
                              <span>{log.metadata.deviceInfo.browser} / {log.metadata.deviceInfo.os}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-white truncate">{log.message}</p>
                        {log.metadata?.url && (
                          <p className="text-xs text-foreground-muted truncate mt-1">
                            {log.metadata.url}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0">
                        {isExpanded ? (
                          <ChevronUp size={20} className="text-foreground-muted" />
                        ) : (
                          <ChevronDown size={20} className="text-foreground-muted" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-white/10 p-4 space-y-4">
                        {/* Device Info */}
                        {log.metadata?.deviceInfo && (
                          <div className="bg-black/20 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                              <DeviceIcon size={16} />
                              מידע על המכשיר
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-foreground-muted">סוג:</span>
                                <span className="text-white mr-2">{log.metadata.deviceInfo.deviceType}</span>
                              </div>
                              <div>
                                <span className="text-foreground-muted">דפדפן:</span>
                                <span className="text-white mr-2">
                                  {log.metadata.deviceInfo.browser} {log.metadata.deviceInfo.browserVersion}
                                </span>
                              </div>
                              <div>
                                <span className="text-foreground-muted">מערכת:</span>
                                <span className="text-white mr-2">
                                  {log.metadata.deviceInfo.os} {log.metadata.deviceInfo.osVersion}
                                </span>
                              </div>
                              <div>
                                <span className="text-foreground-muted">מסך:</span>
                                <span className="text-white mr-2">
                                  {log.metadata.deviceInfo.screenWidth}x{log.metadata.deviceInfo.screenHeight}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* AI Fix Section */}
                        {log.aiFix && (
                          <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-white flex items-center gap-2">
                                <Sparkles size={16} className="text-purple-400" />
                                פתרון AI - העתק ושלח ל-Claude
                              </h4>
                              <button
                                onClick={() => copyToClipboard(log.aiFix!, log.id)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-purple-300 text-sm transition-colors"
                              >
                                {copiedId === log.id ? (
                                  <>
                                    <Check size={14} />
                                    הועתק!
                                  </>
                                ) : (
                                  <>
                                    <Copy size={14} />
                                    העתק לקלוד
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="bg-black/30 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                              {log.aiFix}
                            </pre>
                          </div>
                        )}

                        {/* Raw Metadata */}
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <details className="bg-black/20 rounded-lg">
                            <summary className="p-3 cursor-pointer text-sm text-foreground-muted hover:text-white">
                              מידע גולמי (JSON)
                            </summary>
                            <pre className="p-3 text-xs text-gray-400 overflow-x-auto border-t border-white/10">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="secondary"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                הקודם
              </Button>
              <span className="text-foreground-muted">
                עמוד {page + 1} מתוך {totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                הבא
              </Button>
            </div>
          )}

          {/* Bottom spacing for mobile nav */}
          <div className="h-32 md:h-8" />
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </AppLayout>
  )
}
