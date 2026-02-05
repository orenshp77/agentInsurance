'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Plus, Trash2, ArrowRight, FileText, Upload, Shield, Wallet, Car,
  Home, User, Phone, Mail, MessageCircle, Grid3X3, X, Files, Clock,
  Sparkles, TrendingUp, ChevronLeft, Eye, Menu, Bell, LogOut, Settings
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { AppLayout } from '@/components/layout'
import { showSuccess, showError, showConfirm } from '@/lib/swal'

interface Folder {
  id: string
  name: string
  category: 'INSURANCE' | 'FINANCE' | 'CAR'
  createdAt: string
  _count: {
    files: number
  }
}

interface Client {
  id: string
  name: string
  email: string
  phone?: string
}

interface FileItem {
  id: string
  fileName: string
  fileType: string
  url: string
  createdAt: string
  folder: {
    name: string
    category: string
  }
}

interface ViewAsUser {
  id: string
  name: string
  email: string
  role: string
}

const categoryConfig = {
  INSURANCE: {
    icon: Shield,
    label: 'ביטוח',
    gradient: 'from-blue-500 to-blue-600',
    bgGradient: 'from-blue-500/20 to-blue-600/5',
    border: 'border-blue-500/30',
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    text: 'text-blue-400',
    glow: 'rgba(59, 130, 246, 0.3)',
  },
  FINANCE: {
    icon: Wallet,
    label: 'פיננסים',
    gradient: 'from-emerald-500 to-emerald-600',
    bgGradient: 'from-emerald-500/20 to-emerald-600/5',
    border: 'border-emerald-500/30',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    text: 'text-emerald-400',
    glow: 'rgba(16, 185, 129, 0.3)',
  },
  CAR: {
    icon: Car,
    label: 'רכב',
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-500/20 to-orange-500/5',
    border: 'border-amber-500/30',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
    text: 'text-amber-400',
    glow: 'rgba(245, 158, 11, 0.3)',
  },
}

export default function ClientFoldersAgentContent({ params }: { params: Promise<{ clientId: string }> }) {
  const resolvedParams = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewAsId = searchParams.get('viewAs')
  const [client, setClient] = useState<Client | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [allFiles, setAllFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewAsUser, setViewAsUser] = useState<ViewAsUser | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: 'INSURANCE' as 'INSURANCE' | 'FINANCE' | 'CAR',
  })

  // Floating action bar states
  const [activePopup, setActivePopup] = useState<'contact' | 'documents' | 'stats' | null>(null)

  // Header menu states
  const [showMenu, setShowMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  // Determine if admin is viewing as agent
  const isViewingAs = !!viewAsId && session?.user?.role === 'ADMIN'

  // Fetch viewAs user info
  useEffect(() => {
    if (viewAsId && session?.user?.role === 'ADMIN') {
      fetch(`/api/users/${viewAsId}`)
        .then(res => res.json())
        .then(data => setViewAsUser(data))
        .catch(console.error)
    }
  }, [viewAsId, session])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchClient()
      fetchFolders()
      fetchAllFiles()
    }
  }, [session, resolvedParams.clientId])

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    if (!session?.user) return

    const interval = setInterval(() => {
      fetchFolders()
      fetchAllFiles()
    }, 30000)

    return () => clearInterval(interval)
  }, [session, resolvedParams.clientId])

  const fetchClient = async () => {
    try {
      const res = await fetch(`/api/users/${resolvedParams.clientId}`)
      const data = await res.json()
      setClient(data)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchFolders = async () => {
    try {
      const res = await fetch(`/api/folders?userId=${resolvedParams.clientId}`)
      const data = await res.json()
      // Handle both old array format and new paginated format
      setFolders(Array.isArray(data) ? data : data.folders || [])
    } catch (error) {
      showError('שגיאה בטעינת התיקיות')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllFiles = async () => {
    try {
      const res = await fetch(`/api/files?userId=${resolvedParams.clientId}`)
      if (res.ok) {
        const data = await res.json()
        setAllFiles(data)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId: resolvedParams.clientId,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'שגיאה')
      }

      showSuccess('התיקייה נוצרה בהצלחה')
      setIsModalOpen(false)
      setFormData({ name: '', category: 'INSURANCE' })
      fetchFolders()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'שגיאה ביצירת התיקייה')
    }
  }

  const handleDelete = async (folder: Folder) => {
    const confirmed = await showConfirm(
      'מחיקת תיקייה',
      `האם אתה בטוח שברצונך למחוק את "${folder.name}"? כל הקבצים בתיקייה יימחקו.`
    )

    if (!confirmed) return

    try {
      const res = await fetch(`/api/folders/${folder.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('שגיאה במחיקה')
      }

      showSuccess('התיקייה נמחקה בהצלחה')
      fetchFolders()
    } catch (error) {
      showError('שגיאה במחיקת התיקייה')
      console.error(error)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
    })
  }

  const totalFiles = folders.reduce((acc, f) => acc + f._count.files, 0)

  // Monthly activity data for chart
  const monthlyData = [
    { month: 'ינו', files: 12, value: 45000 },
    { month: 'פבר', files: 8, value: 32000 },
    { month: 'מרץ', files: 15, value: 58000 },
    { month: 'אפר', files: 20, value: 75000 },
    { month: 'מאי', files: 18, value: 68000 },
    { month: 'יונ', files: 25, value: 92000 },
  ]

  if (status === 'loading' || loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-foreground-muted animate-pulse">טוען תיקיות...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Handle back navigation - preserve viewAs context
  const handleGoBack = () => {
    if (viewAsId) {
      router.push(`/agent/clients?viewAs=${viewAsId}`)
    } else {
      router.push('/agent/clients')
    }
  }

  return (
    <AppLayout showHeader={false} showFooter={false}>
      <div className="min-h-screen pb-32 relative">
        {/* Admin Viewing As Banner */}
        {isViewingAs && viewAsUser && (
          <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-amber-500 to-orange-500 py-1 md:py-2 px-3 md:px-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 md:gap-4 text-black font-medium text-xs md:text-base min-w-0">
                <Eye size={14} className="shrink-0 md:w-[18px] md:h-[18px]" />
                <span className="truncate">צופים: {client?.name}</span>
                <span className="text-xs bg-black/20 px-3 py-1 rounded-full hidden md:inline-block">רק אתם רואים</span>
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

        {/* Agent Blue Glow Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-500/12 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[150px]" />
        </div>

        {/* Fixed Top Header with Hamburger Menu */}
        <header className={`fixed left-0 right-0 z-50 bg-background-card/80 backdrop-blur-xl border-b border-primary/10 ${isViewingAs ? 'top-10' : 'top-0'}`}>
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg"
                  style={{ boxShadow: '0 4px 15px rgba(var(--color-primary-rgb), 0.3)' }}>
                  <Files size={22} className="text-white" />
                </div>
                <span className="text-lg font-bold text-primary">
                  תיק לקוח
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2.5 hover:bg-primary/10 rounded-xl transition-all relative"
                  >
                    <Bell size={22} className="text-foreground" />
                  </button>

                  {showNotifications && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                      <div className="absolute left-0 mt-2 w-80 bg-background-card rounded-2xl shadow-2xl border border-primary/20 overflow-hidden z-50">
                        <div className="p-4 border-b border-primary/10">
                          <h3 className="font-bold text-lg">התראות</h3>
                        </div>
                        <div className="p-4 text-center text-foreground-muted">
                          אין התראות חדשות
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex items-center gap-2 p-2 hover:bg-primary/10 rounded-xl transition-all"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center text-white text-sm font-bold">
                      {session?.user?.name?.charAt(0) || 'A'}
                    </div>
                    <Menu size={20} className="text-foreground" />
                  </button>

                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                      <div className="absolute left-0 mt-2 w-72 bg-background-card rounded-2xl shadow-2xl border border-primary/20 overflow-hidden z-50">
                        <div className="p-4 border-b border-primary/10 bg-gradient-to-r from-primary/20 to-accent/10">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg">
                              {session?.user?.name?.charAt(0) || 'A'}
                            </div>
                            <div>
                              <p className="font-bold text-lg">{session?.user?.name}</p>
                              <p className="text-sm text-foreground-muted">{session?.user?.email}</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-2">
                          <button
                            onClick={() => router.push(viewAsId ? `/dashboard?viewAs=${viewAsId}` : '/dashboard')}
                            className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 rounded-xl transition-all text-right"
                          >
                            <Home size={20} className="text-primary" />
                            <span>לוח בקרה</span>
                          </button>
                          <button
                            onClick={() => router.push(viewAsId ? `/agent/clients?viewAs=${viewAsId}` : '/agent/clients')}
                            className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 rounded-xl transition-all text-right"
                          >
                            <User size={20} className="text-primary" />
                            <span>ניהול לקוחות</span>
                          </button>
                          <button
                            onClick={() => router.push(viewAsId ? `/dashboard?viewAs=${viewAsId}` : '/dashboard')}
                            className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 rounded-xl transition-all text-right"
                          >
                            <Settings size={20} className="text-primary" />
                            <span>הגדרות</span>
                          </button>
                        </div>

                        <div className="p-2 border-t border-primary/10">
                          <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="w-full flex items-center gap-3 p-3 hover:bg-error/10 rounded-xl transition-all text-right text-error"
                          >
                            <LogOut size={20} />
                            <span>התנתק</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Header */}
        <div className="relative overflow-hidden pt-16">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20" />
          <div className="absolute inset-0">
            <div className="absolute top-10 right-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-10 left-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          <div className="relative max-w-7xl mx-auto px-4 py-6 md:py-10">
            {/* Back Button */}
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 text-foreground-muted hover:text-foreground mb-6 transition-colors group"
            >
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              <span>חזרה ללקוחות</span>
            </button>

            {/* Client Info */}
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg"
                  style={{ boxShadow: '0 8px 32px rgba(var(--color-primary-rgb), 0.3)' }}>
                  <span className="text-3xl font-bold text-white">
                    {client?.name?.charAt(0)}
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full border-2 border-background flex items-center justify-center">
                  <Sparkles size={12} className="text-white" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">{client?.name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-muted">
                  <div className="flex items-center gap-1">
                    <Mail size={16} />
                    <span>{client?.email}</span>
                  </div>
                  {client?.phone && (
                    <div className="flex items-center gap-1">
                      <Phone size={16} />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {/* View as Client Button */}
                <button
                  onClick={() => router.push(`/agent/clients/${resolvedParams.clientId}/preview`)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all text-sm"
                >
                  <Eye size={18} />
                  <span className="hidden md:inline">צפה כלקוח</span>
                </button>

                {/* Add Folder Button */}
                <Button
                  variant="accent"
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus size={20} />
                  תיקייה חדשה
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="glass-card rounded-2xl p-4 text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Files size={24} className="text-white" />
                </div>
                <div className="text-2xl font-bold">{folders.length}</div>
                <div className="text-xs text-foreground-muted">תיקיות</div>
              </div>
              <div className="glass-card rounded-2xl p-4 text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <FileText size={24} className="text-white" />
                </div>
                <div className="text-2xl font-bold">{totalFiles}</div>
                <div className="text-xs text-foreground-muted">מסמכים</div>
              </div>
              <div className="glass-card rounded-2xl p-4 text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <TrendingUp size={24} className="text-white" />
                </div>
                <div className="text-2xl font-bold">₪{(Math.random() * 100000 + 50000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
                <div className="text-xs text-foreground-muted">שווי תיק</div>
              </div>
              <div className="glass-card rounded-2xl p-4 text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Clock size={24} className="text-white" />
                </div>
                <div className="text-2xl font-bold">
                  {folders.length > 0 ? formatDate(folders[0].createdAt || new Date().toISOString()) : '-'}
                </div>
                <div className="text-xs text-foreground-muted">עדכון אחרון</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          {folders.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center animate-fade-in-up">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <FileText size={48} className="text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">אין תיקיות עדיין</h2>
              <p className="text-foreground-muted mb-6 max-w-md mx-auto">
                צור תיקייה חדשה כדי להתחיל לנהל מסמכים עבור הלקוח
              </p>
              <Button variant="accent" onClick={() => setIsModalOpen(true)}>
                <Plus size={20} className="ml-2" />
                צור תיקייה ראשונה
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {folders.map((folder, index) => {
                const config = categoryConfig[folder.category]
                const Icon = config.icon
                return (
                  <div
                    key={folder.id}
                    className="glass-card rounded-2xl overflow-hidden group hover:scale-[1.02] transition-all duration-300 animate-fade-in-up cursor-pointer"
                    style={{ animationDelay: `${index * 0.05}s` }}
                    onClick={() =>
                      router.push(
                        `/agent/clients/${resolvedParams.clientId}/folders/${folder.id}${viewAsId ? `?viewAs=${viewAsId}` : ''}`
                      )
                    }
                  >
                    {/* Category Header */}
                    <div className={`h-2 bg-gradient-to-r ${config.gradient}`} />

                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl ${config.iconBg} shadow-lg`}
                          style={{ boxShadow: `0 4px 20px ${config.glow}` }}>
                          <Icon size={28} className="text-white" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium bg-white/10 ${config.text}`}>
                            {config.label}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(folder)
                            }}
                            className="p-2 hover:bg-error/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} className="text-error" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                        {folder.name}
                      </h3>

                      <div className="flex items-center justify-between text-sm text-foreground-muted">
                        <div className="flex items-center gap-2">
                          <Upload size={14} />
                          <span>{folder._count.files} קבצים</span>
                        </div>
                        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>

        {/* Floating Action Bar - Dynamic Island Style */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-[32px] bg-[#0d1117] border-2 border-[#30363d] shadow-[0_8px_40px_rgba(0,0,0,0.8)]"
            style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05)' }}
          >
            {/* Home Button */}
            <button
              onClick={() => router.push(viewAsId ? `/dashboard?viewAs=${viewAsId}` : '/dashboard')}
              className="p-3 rounded-2xl bg-gradient-to-br from-lime-400 to-green-500 hover:from-lime-300 hover:to-green-400 transition-all shadow-lg"
              style={{ boxShadow: '0 4px 15px rgba(163, 230, 53, 0.3)' }}
            >
              <Home size={22} className="text-black" />
            </button>

            {/* Contact Button */}
            <button
              onClick={() => setActivePopup(activePopup === 'contact' ? null : 'contact')}
              className={`p-3 rounded-2xl transition-all ${
                activePopup === 'contact'
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              <User size={22} className={activePopup === 'contact' ? 'text-white' : 'text-white/70'} />
            </button>

            {/* Center Circle - All Documents */}
            <button
              onClick={() => setActivePopup(activePopup === 'documents' ? null : 'documents')}
              className={`relative w-14 h-14 rounded-full transition-all ${
                activePopup === 'documents'
                  ? 'bg-gradient-to-br from-primary to-accent scale-110'
                  : 'bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700'
              }`}
              style={{ boxShadow: activePopup === 'documents' ? '0 0 30px rgba(var(--color-primary-rgb), 0.5)' : 'none' }}
            >
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
              <Files size={24} className="text-white mx-auto" />
            </button>

            {/* Stats Button */}
            <button
              onClick={() => setActivePopup(activePopup === 'stats' ? null : 'stats')}
              className={`p-3 rounded-2xl transition-all ${
                activePopup === 'stats'
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              <Grid3X3 size={22} className={activePopup === 'stats' ? 'text-white' : 'text-white/70'} />
            </button>

            {/* New Folder Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-3 rounded-2xl bg-gradient-to-br from-accent to-secondary hover:from-accent/80 hover:to-secondary/80 transition-all shadow-lg"
              style={{ boxShadow: '0 4px 15px rgba(var(--color-accent-rgb), 0.3)' }}
            >
              <Plus size={22} className="text-white" />
            </button>
          </div>

          {/* Contact Popup */}
          {activePopup === 'contact' && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-72 bg-[#0d1117] rounded-2xl p-4 border-2 border-[#30363d] shadow-[0_8px_40px_rgba(0,0,0,0.8)] animate-scale-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">יצירת קשר</h3>
                <button onClick={() => setActivePopup(null)} className="p-1 hover:bg-white/10 rounded-lg">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2">
                <a
                  href={`https://wa.me/${client?.phone?.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-all"
                >
                  <MessageCircle size={20} />
                  <span>וואטסאפ</span>
                </a>
                <a
                  href={`mailto:${client?.email}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-all"
                >
                  <Mail size={20} />
                  <span>אימייל</span>
                </a>
                <a
                  href={`tel:${client?.phone}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-accent/20 border border-accent/30 text-accent hover:bg-accent/30 transition-all"
                >
                  <Phone size={20} />
                  <span>טלפון</span>
                </a>
              </div>
            </div>
          )}

          {/* Documents Popup */}
          {activePopup === 'documents' && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-80 bg-[#0d1117] rounded-2xl p-4 border-2 border-[#30363d] shadow-[0_8px_40px_rgba(0,0,0,0.8)] animate-scale-in max-h-96 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Files size={18} className="text-primary" />
                  כל המסמכים ({allFiles.length})
                </h3>
                <button onClick={() => setActivePopup(null)} className="p-1 hover:bg-white/10 rounded-lg">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {allFiles.length === 0 ? (
                  <p className="text-center text-foreground-muted py-4 text-sm">אין מסמכים עדיין</p>
                ) : (
                  allFiles.slice(0, 10).map((file) => (
                    <a
                      key={file.id}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
                    >
                      <div className="p-2 rounded-lg bg-primary/20">
                        <FileText size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {file.fileName}
                        </p>
                        <p className="text-xs text-foreground-muted">
                          {file.folder?.name} • {file.fileType}
                        </p>
                      </div>
                      <Eye size={14} className="text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Stats Popup */}
          {activePopup === 'stats' && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-80 bg-[#0d1117] rounded-2xl p-4 border-2 border-[#30363d] shadow-[0_8px_40px_rgba(0,0,0,0.8)] animate-scale-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <TrendingUp size={18} className="text-accent" />
                  סטטיסטיקת פעילות
                </h3>
                <button onClick={() => setActivePopup(null)} className="p-1 hover:bg-white/10 rounded-lg">
                  <X size={16} />
                </button>
              </div>

              {/* Mini Chart */}
              <div className="mb-4">
                <div className="flex items-end justify-between h-32 gap-2">
                  {monthlyData.map((data, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-gradient-to-t from-primary to-accent rounded-t-lg transition-all hover:opacity-80"
                        style={{ height: `${(data.files / 25) * 100}%` }}
                      />
                      <span className="text-xs text-foreground-muted">{data.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 text-center">
                  <p className="text-lg font-bold text-primary">{totalFiles}</p>
                  <p className="text-xs text-foreground-muted">מסמכים</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 text-center">
                  <p className="text-lg font-bold text-accent">₪{monthlyData.reduce((a, b) => a + b.value, 0).toLocaleString()}</p>
                  <p className="text-xs text-foreground-muted">שווי כולל</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="תיקייה חדשה"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="שם התיקייה"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <div>
              <label className="block text-sm font-medium mb-2">קטגוריה</label>
              <div className="grid grid-cols-3 gap-3">
                {(['INSURANCE', 'FINANCE', 'CAR'] as const).map((cat) => {
                  const config = categoryConfig[cat]
                  const Icon = config.icon
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.category === cat
                          ? `border-transparent ${config.iconBg}`
                          : 'border-white/20 hover:border-white/40 bg-white/5'
                      }`}
                    >
                      <Icon
                        size={24}
                        className={`mx-auto mb-2 ${formData.category === cat ? 'text-white' : config.text}`}
                      />
                      <span className={`text-sm ${formData.category === cat ? 'text-white' : ''}`}>
                        {config.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" variant="accent" className="flex-1">
                צור תיקייה
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="flex-1"
              >
                ביטול
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  )
}
