'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  FileText, Shield, Wallet, Car, FolderOpen, Files,
  ChevronLeft, Clock, Eye, Sparkles, TrendingUp,
  Home, User, Circle, LayoutGrid, X, MessageCircle,
  Mail, Phone, BarChart3, Activity, CheckCircle, Calendar,
  Menu, LogOut, List, PhoneCall, Bell, Cloud
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { AppLayout } from '@/components/layout'
import { showError } from '@/lib/swal'
import BarChart from '@/components/ui/BarChart'

interface Folder {
  id: string
  name: string
  category: 'INSURANCE' | 'FINANCE' | 'CAR'
  createdAt: string
  _count: {
    files: number
  }
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

// Mock activity data for the chart
const monthlyActivity = [
  { month: 'ינו', actions: 5, value: 12000 },
  { month: 'פבר', actions: 8, value: 18000 },
  { month: 'מרץ', actions: 3, value: 8000 },
  { month: 'אפר', actions: 12, value: 25000 },
  { month: 'מאי', actions: 7, value: 15000 },
  { month: 'יוני', actions: 10, value: 22000 },
]

export default function ClientFoldersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [folders, setFolders] = useState<Folder[]>([])
  const [allFiles, setAllFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)

  // Floating bar states
  const [showDocuments, setShowDocuments] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [activeView, setActiveView] = useState<'home' | 'documents' | 'stats'>('home')
  const [showMenu, setShowMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [showBackground, setShowBackground] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Mock notifications data
  const notifications = [
    { id: 1, title: 'מסמך חדש נוסף', description: 'פוליסת ביטוח רכב עודכנה', time: 'לפני 2 שעות', isNew: true },
    { id: 2, title: 'תיקייה חדשה', description: 'תיקיית פיננסים נוספה לתיק שלך', time: 'לפני יום', isNew: true },
    { id: 3, title: 'עדכון מהסוכן', description: 'הפוליסה שלך חודשה בהצלחה', time: 'לפני 3 ימים', isNew: false },
  ]

  // Background landscape images with names
  const landscapes = [
    { name: 'הרים בשלג', image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80' },
    { name: 'שקיעה בהרים', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80' },
    { name: 'אורורה בוראלית', image: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=80' },
    { name: 'לילה כוכבי', image: 'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=1920&q=80' },
    { name: 'יער בערפל', image: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1920&q=80' },
    { name: 'אגם בהרים', image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80' },
    { name: 'מפל מים', image: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1920&q=80' },
    { name: 'חוף ושקיעה', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80' },
  ]

  const changeBackground = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentBgIndex((prev) => (prev + 1) % landscapes.length)
      setIsTransitioning(false)
    }, 500)
  }

  // Rotate background images
  useEffect(() => {
    if (!showBackground) return
    const interval = setInterval(() => {
      changeBackground()
    }, 15000)
    return () => clearInterval(interval)
  }, [showBackground, currentBgIndex])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchFolders()
      fetchAllFiles()
    }
  }, [session])

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/folders')
      const data = await res.json()
      setFolders(data)
    } catch (error) {
      showError('שגיאה בטעינת התיקיות')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllFiles = async () => {
    try {
      const res = await fetch('/api/files/all')
      if (res.ok) {
        const data = await res.json()
        setAllFiles(data)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
    })
  }

  // Stats calculations
  const totalFolders = folders.length
  const totalFiles = folders.reduce((acc, f) => acc + f._count.files, 0)
  const categoryCounts = {
    INSURANCE: folders.filter((f) => f.category === 'INSURANCE').length,
    FINANCE: folders.filter((f) => f.category === 'FINANCE').length,
    CAR: folders.filter((f) => f.category === 'CAR').length,
  }

  const closeAllModals = () => {
    setShowDocuments(false)
    setShowContact(false)
    setShowStats(false)
    setShowMenu(false)
    setShowNotifications(false)
  }

  if (status === 'loading' || loading) {
    return (
      <AppLayout showHeader={false} showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 relative">
              <div className="absolute inset-0 border-4 border-primary/30 rounded-full" />
              <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-2 border-4 border-accent/30 rounded-full" />
              <div className="absolute inset-2 border-4 border-accent border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            </div>
            <p className="text-foreground-muted animate-pulse text-lg">טוען את התיק שלך...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout showHeader={false} showFooter={false}>
      <div className="min-h-screen pb-32 relative">
        {/* Full Screen Dynamic Background */}
        {showBackground && (
          <div className="fixed inset-0 z-0">
            <div className={`absolute inset-0 transition-opacity duration-700 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              <img
                src={landscapes[currentBgIndex].image}
                alt={landscapes[currentBgIndex].name}
                className="w-full h-full object-cover"
              />
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#0d1117]/80 to-[#0d1117]" />
            </div>
          </div>
        )}

        {/* Background Controls */}
        <div className="fixed top-20 left-4 z-40">
          <button
            onClick={() => setShowBackground(!showBackground)}
            className={`p-2.5 rounded-full transition-all ${
              showBackground
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-purple-600/60 hover:bg-purple-600'
            }`}
            title={showBackground ? 'הסתר רקע' : 'הצג רקע'}
          >
            <Cloud size={18} className="text-white" />
          </button>
        </div>

        {/* Fixed Header with Logo and Hamburger */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#0d1117]/90 backdrop-blur-md border-b border-white/5">
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
                  <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
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
                    {/* Notification badge */}
                    {notifications.some(n => n.isNew) && (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowNotifications(false)}
                      />
                      <div className="absolute left-0 top-full mt-2 w-80 bg-[#0d1117] border-2 border-[#30363d] rounded-2xl p-4 z-50 shadow-[0_8px_40px_rgba(0,0,0,0.8)] animate-scale-in-menu">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-lg flex items-center gap-2">
                            <Bell size={18} className="text-primary" />
                            התראות
                          </h3>
                          <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">
                            {notifications.filter(n => n.isNew).length} חדשות
                          </span>
                        </div>
                        <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-3 rounded-xl transition-all cursor-pointer ${
                                notification.isNew
                                  ? 'bg-primary/10 border border-primary/20 hover:bg-primary/20'
                                  : 'bg-white/5 hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {notification.isNew && (
                                  <span className="w-2 h-2 mt-2 bg-primary rounded-full flex-shrink-0" />
                                )}
                                <div className={notification.isNew ? '' : 'mr-5'}>
                                  <p className="font-medium text-sm">{notification.title}</p>
                                  <p className="text-xs text-foreground-muted mt-0.5">{notification.description}</p>
                                  <p className="text-xs text-foreground-muted/60 mt-1">{notification.time}</p>
                                </div>
                              </div>
                            </div>
                          ))}
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
                    {/* User Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center text-white font-bold">
                      {session?.user?.name?.charAt(0)}
                    </div>
                    <Menu size={20} className="text-foreground-muted" />
                  </button>

                {/* Menu Dropdown */}
                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute left-0 top-full mt-2 w-72 bg-[#0d1117] border-2 border-[#30363d] rounded-2xl p-4 z-50 shadow-[0_8px_40px_rgba(0,0,0,0.8)] animate-scale-in-menu">
                      {/* User Info Section */}
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center text-white font-bold text-lg">
                          {session?.user?.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold">{session?.user?.name}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-accent to-secondary text-white">
                            לקוח
                          </span>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <button
                        onClick={() => {
                          setShowContact(true)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all text-right"
                      >
                        <div className="p-2 rounded-lg bg-green-500/20">
                          <PhoneCall size={18} className="text-green-400" />
                        </div>
                        <span>יצירת קשר עם הסוכן</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowDocuments(true)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all text-right"
                      >
                        <div className="p-2 rounded-lg bg-primary/20">
                          <List size={18} className="text-primary" />
                        </div>
                        <span>צפייה בכל המסמכים</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowStats(true)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all text-right"
                      >
                        <div className="p-2 rounded-lg bg-accent/20">
                          <BarChart3 size={18} className="text-accent" />
                        </div>
                        <span>סטטיסטיקות ופעילות</span>
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

        {/* Hero Section - with top padding for fixed header */}
        <div className="relative overflow-hidden pt-16">
          {/* Glow effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 py-10 md:py-16">
            {/* Welcome Section */}
            <div className="text-center mb-10 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 border border-white/10 mb-6 backdrop-blur-sm">
                <span className="text-sm font-medium">האזור האישי שלך</span>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                שלום, <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">{session?.user?.name}</span>
              </h1>
              <p className="text-xl text-foreground-muted max-w-md mx-auto">
                מה נעשה עד היום עבורך..!
              </p>
            </div>

            {/* Premium Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              {/* Total Folders */}
              <div className="group relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-xl hover:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-14 h-14 mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/30">
                    <FolderOpen size={28} className="text-white" />
                  </div>
                  <div className="text-3xl font-bold mb-1">{totalFolders}</div>
                  <div className="text-sm text-foreground-muted">תיקיות פעילות</div>
                </div>
              </div>

              {/* Total Files */}
              <div className="group relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-xl hover:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-14 h-14 mb-4 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center shadow-lg shadow-accent/30">
                    <Files size={28} className="text-white" />
                  </div>
                  <div className="text-3xl font-bold mb-1">{totalFiles}</div>
                  <div className="text-sm text-foreground-muted">מסמכים</div>
                </div>
              </div>

              {/* Actions This Month */}
              <div className="group relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-xl hover:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-14 h-14 mb-4 rounded-2xl bg-gradient-to-br from-secondary to-secondary-dark flex items-center justify-center shadow-lg shadow-secondary/30">
                    <Activity size={28} className="text-white" />
                  </div>
                  <div className="text-3xl font-bold mb-1">{monthlyActivity[monthlyActivity.length - 1].actions}</div>
                  <div className="text-sm text-foreground-muted">פעולות החודש</div>
                </div>
              </div>

              {/* Total Value */}
              <div className="group relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-xl hover:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-success/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-14 h-14 mb-4 rounded-2xl bg-gradient-to-br from-success to-emerald-600 flex items-center justify-center shadow-lg shadow-success/30">
                    <TrendingUp size={28} className="text-white" />
                  </div>
                  <div className="text-3xl font-bold mb-1">₪{(monthlyActivity.reduce((a, b) => a + b.value, 0) / 1000).toFixed(0)}K</div>
                  <div className="text-sm text-foreground-muted">ערך מצטבר</div>
                </div>
              </div>
            </div>

            {/* Statistics Chart */}
            <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <BarChart
                title="סטטיסטיקה חודשית"
                subtitle="פעילות מסמכים ותיקיות"
                data={[
                  { label: 'אוג', value1: 15, value2: 12 },
                  { label: 'ספט', value1: 22, value2: 18 },
                  { label: 'אוק', value1: 18, value2: 25 },
                  { label: 'נוב', value1: 30, value2: 20 },
                  { label: 'דצמ', value1: totalFiles || 25, value2: 15 },
                  { label: 'ינו', value1: 20, value2: 28 },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Main Content - Folders */}
        {activeView === 'home' && (
          <main className="max-w-7xl mx-auto px-4 py-8">
            {folders.length === 0 ? (
              <div className="glass-card rounded-3xl p-12 text-center animate-fade-in-up">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <FolderOpen size={48} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">אין תיקיות עדיין</h2>
                <p className="text-foreground-muted mb-6 max-w-md mx-auto">
                  הסוכן שלך יוסיף עבורך תיקיות ומסמכים בקרוב
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {(['INSURANCE', 'FINANCE', 'CAR'] as const).map((category, categoryIndex) => {
                  const categoryFolders = folders.filter((f) => f.category === category)
                  if (categoryFolders.length === 0) return null

                  const config = categoryConfig[category]
                  const Icon = config.icon

                  return (
                    <div
                      key={category}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${0.3 + categoryIndex * 0.1}s` }}
                    >
                      <div className="flex items-center gap-4 mb-6">
                        <div className={`p-3 rounded-2xl ${config.iconBg} shadow-lg`} style={{ boxShadow: `0 8px 32px ${config.glow}` }}>
                          <Icon size={28} className="text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">{config.label}</h2>
                          <p className="text-sm text-foreground-muted">
                            {categoryFolders.length} תיקיות • {categoryFolders.reduce((acc, f) => acc + f._count.files, 0)} מסמכים
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryFolders.map((folder, folderIndex) => (
                          <div
                            key={folder.id}
                            onClick={() => router.push(`/client/folders/${folder.id}`)}
                            className={`
                              relative overflow-hidden rounded-2xl p-6 cursor-pointer
                              bg-gradient-to-br ${config.bgGradient}
                              border ${config.border}
                              backdrop-blur-sm transition-all duration-300
                              hover:scale-[1.03] hover:shadow-2xl group
                            `}
                            style={{ boxShadow: `0 4px 20px ${config.glow}` }}
                          >
                            <div className="absolute inset-0 opacity-5">
                              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20" />
                            </div>

                            <div className="relative z-10">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <h3 className="font-bold text-lg mb-1 group-hover:text-white transition-colors">
                                    {folder.name}
                                  </h3>
                                  <p className="text-sm text-foreground-muted flex items-center gap-1">
                                    <Clock size={12} />
                                    {formatDate(folder.createdAt)}
                                  </p>
                                </div>
                                <div className={`p-2 rounded-xl ${config.iconBg} opacity-80`}>
                                  <Icon size={20} className="text-white" />
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Files size={16} className={config.text} />
                                  <span className={`text-sm font-medium ${config.text}`}>
                                    {folder._count.files} מסמכים
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 group-hover:bg-white/20 transition-all">
                                  <Eye size={14} className="text-white/80" />
                                  <span className="text-xs text-white/80">צפה</span>
                                  <ChevronLeft size={14} className="text-white/80 group-hover:-translate-x-1 transition-transform" />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </main>
        )}

        {/* ==================== FLOATING ACTION BAR ==================== */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="relative">
            {/* Main Bar */}
            <div className="flex items-center gap-2 px-4 py-3 rounded-[32px] bg-[#0d1117] border-2 border-[#30363d] shadow-[0_8px_40px_rgba(0,0,0,0.8)]">
              {/* Home Button */}
              <button
                onClick={() => {
                  closeAllModals()
                  setActiveView('home')
                }}
                className={`relative p-4 rounded-2xl transition-all duration-300 ${
                  activeView === 'home'
                    ? 'bg-gradient-to-br from-lime-400 to-lime-500 shadow-lg shadow-lime-500/30'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <Home size={22} className={activeView === 'home' ? 'text-black' : 'text-white'} />
              </button>

              {/* Contact Button */}
              <button
                onClick={() => {
                  setShowContact(!showContact)
                  setShowDocuments(false)
                  setShowStats(false)
                }}
                className={`relative p-4 rounded-2xl transition-all duration-300 ${
                  showContact
                    ? 'bg-gradient-to-br from-lime-400 to-lime-500 shadow-lg shadow-lime-500/30'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <User size={22} className={showContact ? 'text-black' : 'text-white'} />
              </button>

              {/* Center Circle - Documents */}
              <button
                onClick={() => {
                  setShowDocuments(!showDocuments)
                  setShowContact(false)
                  setShowStats(false)
                }}
                className={`relative p-5 rounded-full transition-all duration-300 mx-2 ${
                  showDocuments
                    ? 'bg-white shadow-lg shadow-white/30 scale-110'
                    : 'bg-gradient-to-br from-white/20 to-white/10 border-2 border-white/30 hover:bg-white/20 hover:scale-105'
                }`}
              >
                <Circle size={24} className={showDocuments ? 'text-black' : 'text-white'} fill={showDocuments ? 'black' : 'none'} />
              </button>

              {/* Stats Button */}
              <button
                onClick={() => {
                  setShowStats(!showStats)
                  setShowDocuments(false)
                  setShowContact(false)
                }}
                className={`relative p-4 rounded-2xl transition-all duration-300 ${
                  showStats
                    ? 'bg-gradient-to-br from-lime-400 to-lime-500 shadow-lg shadow-lime-500/30'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <LayoutGrid size={22} className={showStats ? 'text-black' : 'text-white'} />
              </button>

              {/* Placeholder for balance */}
              <div className="px-4 py-2 rounded-xl bg-white/5">
                <span className="text-xs text-foreground-muted">₪{(monthlyActivity.reduce((a, b) => a + b.value, 0)).toLocaleString()}</span>
              </div>
            </div>

            {/* Contact Popup */}
            {showContact && (
              <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-72 animate-scale-in">
                <div className="bg-[#0d1117] rounded-3xl p-6 border-2 border-[#30363d] shadow-[0_8px_40px_rgba(0,0,0,0.8)]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">צור קשר עם הסוכן</h3>
                    <button onClick={() => setShowContact(false)} className="p-1 hover:bg-white/10 rounded-lg">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => window.open('https://wa.me/', '_blank')}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 hover:from-green-500/30 hover:to-green-600/30 transition-all group"
                    >
                      <div className="p-2 rounded-xl bg-green-500">
                        <MessageCircle size={20} className="text-white" />
                      </div>
                      <div className="text-right">
                        <div className="font-medium">וואטסאפ</div>
                        <div className="text-xs text-foreground-muted">תגובה מיידית</div>
                      </div>
                    </button>
                    <button
                      onClick={() => window.location.href = 'mailto:'}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 hover:from-primary/30 hover:to-accent/30 transition-all group"
                    >
                      <div className="p-2 rounded-xl bg-primary">
                        <Mail size={20} className="text-white" />
                      </div>
                      <div className="text-right">
                        <div className="font-medium">אימייל</div>
                        <div className="text-xs text-foreground-muted">שלח הודעה</div>
                      </div>
                    </button>
                    <button
                      onClick={() => window.location.href = 'tel:'}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-secondary/20 to-tertiary/20 border border-secondary/30 hover:from-secondary/30 hover:to-tertiary/30 transition-all group"
                    >
                      <div className="p-2 rounded-xl bg-secondary">
                        <Phone size={20} className="text-white" />
                      </div>
                      <div className="text-right">
                        <div className="font-medium">טלפון</div>
                        <div className="text-xs text-foreground-muted">התקשר עכשיו</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Documents Popup */}
            {showDocuments && (
              <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-80 max-h-96 animate-scale-in">
                <div className="bg-[#0d1117] rounded-3xl p-6 border-2 border-[#30363d] shadow-[0_8px_40px_rgba(0,0,0,0.8)]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Files size={20} className="text-primary" />
                      כל המסמכים
                    </h3>
                    <button onClick={() => setShowDocuments(false)} className="p-1 hover:bg-white/10 rounded-lg">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {folders.flatMap(folder =>
                      Array(folder._count.files).fill(null).map((_, i) => (
                        <div
                          key={`${folder.id}-${i}`}
                          onClick={() => router.push(`/client/folders/${folder.id}`)}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer group"
                        >
                          <div className={`p-2 rounded-lg ${categoryConfig[folder.category].iconBg}`}>
                            <FileText size={16} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{folder.name} - מסמך {i + 1}</div>
                            <div className="text-xs text-foreground-muted">{categoryConfig[folder.category].label}</div>
                          </div>
                          <ChevronLeft size={16} className="text-foreground-muted group-hover:text-white group-hover:-translate-x-1 transition-all" />
                        </div>
                      ))
                    )}
                    {totalFiles === 0 && (
                      <div className="text-center py-8 text-foreground-muted">
                        <Files size={32} className="mx-auto mb-2 opacity-50" />
                        <p>אין מסמכים עדיין</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Stats Popup */}
            {showStats && (
              <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-80 animate-scale-in">
                <div className="bg-[#0d1117] rounded-3xl p-6 border-2 border-[#30363d] shadow-[0_8px_40px_rgba(0,0,0,0.8)]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <BarChart3 size={20} className="text-accent" />
                      פעילות הסוכן
                    </h3>
                    <button onClick={() => setShowStats(false)} className="p-1 hover:bg-white/10 rounded-lg">
                      <X size={18} />
                    </button>
                  </div>

                  {/* Mini Chart */}
                  <div className="mb-4">
                    <div className="flex items-end justify-between h-32 gap-2 px-2">
                      {monthlyActivity.map((item, index) => {
                        const maxActions = Math.max(...monthlyActivity.map(a => a.actions))
                        const height = (item.actions / maxActions) * 100
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className="w-full rounded-t-lg bg-gradient-to-t from-primary to-accent transition-all duration-500"
                              style={{ height: `${height}%` }}
                            />
                            <span className="text-[10px] text-foreground-muted">{item.month}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Stats Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white/5">
                      <div className="text-xs text-foreground-muted mb-1">סה"כ פעולות</div>
                      <div className="text-xl font-bold text-primary">{monthlyActivity.reduce((a, b) => a + b.actions, 0)}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5">
                      <div className="text-xs text-foreground-muted mb-1">ערך כלכלי</div>
                      <div className="text-xl font-bold text-success">₪{(monthlyActivity.reduce((a, b) => a + b.value, 0)).toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Recent Actions */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="text-xs text-foreground-muted mb-2">פעולות אחרונות</div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle size={14} className="text-success" />
                        <span>חידוש פוליסה - ביטוח רכב</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle size={14} className="text-success" />
                        <span>הוספת מסמך - פיננסים</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle size={14} className="text-success" />
                        <span>עדכון תיק - ביטוח בריאות</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Overlay when modals open */}
        {(showContact || showDocuments || showStats) && (
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={closeAllModals}
          />
        )}

      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 2px;
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: translate(-50%, 10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out forwards;
        }
        @keyframes scale-in-menu {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-scale-in-menu {
          animation: scale-in-menu 0.2s ease-out forwards;
        }
      `}</style>
    </AppLayout>
  )
}
