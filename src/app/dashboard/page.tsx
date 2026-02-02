'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Users, FolderOpen, FileText, TrendingUp, ArrowUpRight,
  Shield, Wallet, Car, Bell, Eye, Clock, ChevronLeft
} from 'lucide-react'
import { AppLayout } from '@/components/layout'
import MobileNav from '@/components/layout/MobileNav'
import BarChart from '@/components/ui/BarChart'

interface Stats {
  users: number
  folders: number
  files: number
}

interface CategoryStats {
  insurance: { folders: number; files: number }
  finance: { folders: number; files: number }
  car: { folders: number; files: number }
}

interface RecentFile {
  id: string
  fileName: string
  fileType: string
  createdAt: string
  folder: {
    name: string
    category: string
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ users: 0, folders: 0, files: 0 })
  const [categoryStats, setCategoryStats] = useState<CategoryStats>({
    insurance: { folders: 0, files: 0 },
    finance: { folders: 0, files: 0 },
    car: { folders: 0, files: 0 },
  })
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchStats()
      fetchRecentFiles()
    }
  }, [session])

  const fetchStats = async () => {
    try {
      if (session?.user?.role !== 'CLIENT') {
        const usersRes = await fetch('/api/users')
        const usersData = await usersRes.json()
        setStats((prev) => ({ ...prev, users: usersData.length || 0 }))
      }

      const foldersRes = await fetch('/api/folders')
      const foldersData = await foldersRes.json()

      // Calculate category stats
      const catStats = {
        insurance: { folders: 0, files: 0 },
        finance: { folders: 0, files: 0 },
        car: { folders: 0, files: 0 },
      }

      foldersData.forEach((folder: { category: string; _count?: { files: number } }) => {
        const cat = folder.category?.toLowerCase()
        if (cat === 'insurance') {
          catStats.insurance.folders++
          catStats.insurance.files += folder._count?.files || 0
        } else if (cat === 'finance') {
          catStats.finance.folders++
          catStats.finance.files += folder._count?.files || 0
        } else if (cat === 'car') {
          catStats.car.folders++
          catStats.car.files += folder._count?.files || 0
        }
      })

      setCategoryStats(catStats)

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
      const res = await fetch('/api/files?limit=5')
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

  return (
    <AppLayout showFooter={false}>
      <div className="min-h-screen bg-background bg-mesh bg-grid">
        {/* Blobs for decoration */}
        <div className="blob-1 -top-40 -right-40 hidden md:block" />
        <div className="blob-2 top-1/2 -left-60 hidden md:block" />

        <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
          {/* Header Section */}
          <div className="flex items-start justify-between mb-8 animate-fade-in-up">
            <div>
              <p className="text-foreground-muted text-sm mb-1">{getGreeting()} 👋</p>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                שלום, <span className="text-gradient">{session.user.name}</span>
              </h1>
              <p className="text-foreground-subtle text-sm">מה נעשה היום?</p>
            </div>

            {/* Notification Bell - Desktop */}
            <button className="hidden md:flex p-3 glass rounded-xl hover:bg-white/10 transition-all relative">
              <Bell size={22} className="text-foreground-muted" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-tertiary rounded-full animate-pulse" />
            </button>
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
                  <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                    <Users size={20} className="text-primary" />
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
                  <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5">
                    <FolderOpen size={20} className="text-accent" />
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
                  <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5">
                    <FileText size={20} className="text-secondary" />
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

          {/* Activity Chart */}
          <div className="mb-8 animate-fade-in-up">
            <BarChart
              title="סטטיסטיקה חודשית"
              subtitle="פעילות מסמכים ותיקיות"
              data={[
                { label: 'אוג', value1: categoryStats.insurance.files || 15, value2: categoryStats.finance.files || 12 },
                { label: 'ספט', value1: 22, value2: 18 },
                { label: 'אוק', value1: 18, value2: 25 },
                { label: 'נוב', value1: 30, value2: 20 },
                { label: 'דצמ', value1: stats.files || 25, value2: categoryStats.car.files || 15 },
                { label: 'ינו', value1: 20, value2: 28 },
              ]}
            />
          </div>

          {/* Categories Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="w-1 h-5 bg-gradient-to-b from-primary to-accent rounded-full" />
                קטגוריות
              </h2>
              <button
                onClick={() => router.push(isClient ? '/client/folders' : '/agent/clients')}
                className="text-primary text-sm flex items-center gap-1 hover:underline"
              >
                הצג הכל
                <ChevronLeft size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 animate-fade-in-up">
              {/* Insurance Card */}
              <div
                onClick={() => router.push(isClient ? '/client/folders' : '/agent/upload/insurance')}
                className="card-premium p-5 cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                      <Shield size={24} className="text-white" />
                    </div>
                    <div className="badge badge-primary">
                      {categoryStats.insurance.files} קבצים
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-1">ביטוח</h3>
                  <p className="text-foreground-subtle text-sm mb-4">
                    {categoryStats.insurance.folders} תיקיות פעילות
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-primary">{isClient ? 'צפה בפוליסות' : 'העלה מסמכים'}</span>
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-all">
                      <ArrowUpRight size={16} className="text-primary" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Finance Card */}
              <div
                onClick={() => router.push(isClient ? '/client/folders' : '/agent/upload/finance')}
                className="card-premium p-5 cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-secondary to-secondary-dark shadow-lg">
                      <Wallet size={24} className="text-white" />
                    </div>
                    <div className="badge badge-accent">
                      {categoryStats.finance.files} קבצים
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-1">פיננסים</h3>
                  <p className="text-foreground-subtle text-sm mb-4">
                    {categoryStats.finance.folders} תיקיות פעילות
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-secondary">{isClient ? 'צפה בהשקעות' : 'העלה מסמכים'}</span>
                    <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/30 transition-all">
                      <ArrowUpRight size={16} className="text-secondary" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Car Card - Full Width */}
              <div
                onClick={() => router.push(isClient ? '/client/folders' : '/agent/upload/car')}
                className="card-premium p-5 cursor-pointer group relative overflow-hidden col-span-2"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent" />
                <div className="relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-success to-emerald-600 shadow-lg">
                      <Car size={28} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">רכב</h3>
                      <p className="text-foreground-subtle text-sm">
                        {categoryStats.car.folders} תיקיות • {categoryStats.car.files} קבצים
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center group-hover:bg-success/30 transition-all">
                      <ArrowUpRight size={18} className="text-success" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Documents */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="w-1 h-5 bg-gradient-to-b from-accent to-secondary rounded-full" />
                מסמכים אחרונים
              </h2>
            </div>

            <div className="space-y-3 animate-fade-in-up">
              {recentFiles.length === 0 ? (
                <div className="glass-card rounded-2xl p-8 text-center">
                  <FileText size={40} className="mx-auto text-foreground-subtle mb-3" />
                  <p className="text-foreground-muted">אין מסמכים להצגה</p>
                </div>
              ) : (
                recentFiles.slice(0, 4).map((file, index) => (
                  <div
                    key={file.id}
                    className="glass-card rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 transition-all cursor-pointer"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className={`p-3 rounded-xl ${
                      file.fileType === 'PDF'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {file.fileType === 'PDF' ? (
                        <FileText size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{file.fileName}</h4>
                      <p className="text-foreground-subtle text-xs truncate">
                        {file.folder?.name || 'תיקייה'}
                      </p>
                    </div>
                    <div className="text-left">
                      <span className="text-foreground-subtle text-xs flex items-center gap-1">
                        <Clock size={12} />
                        {formatTimeAgo(file.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions - Non-Client */}
          {!isClient && (
            <div className="hidden md:block mb-8">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <span className="w-1 h-5 bg-gradient-to-b from-primary to-secondary rounded-full" />
                פעולות מהירות
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => router.push(session.user.role === 'ADMIN' ? '/admin/agents' : '/agent/clients')}
                  className="glass-card p-6 rounded-2xl text-right hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <ArrowUpRight size={20} className="text-foreground-muted group-hover:text-primary transition-colors" />
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary-dark">
                      <Users size={24} className="text-white" />
                    </div>
                  </div>
                  <h4 className="font-bold text-lg mb-1">
                    {session.user.role === 'ADMIN' ? 'ניהול סוכנים' : 'ניהול לקוחות'}
                  </h4>
                  <p className="text-foreground-muted text-sm">הוסף, ערוך ונהל</p>
                </button>

                <button
                  onClick={() => router.push('/agent/clients')}
                  className="glass-card p-6 rounded-2xl text-right hover:border-accent/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <ArrowUpRight size={20} className="text-foreground-muted group-hover:text-accent transition-colors" />
                    <div className="p-3 rounded-xl bg-gradient-to-br from-accent to-accent-dark">
                      <FolderOpen size={24} className="text-white" />
                    </div>
                  </div>
                  <h4 className="font-bold text-lg mb-1">צפה בתיקים</h4>
                  <p className="text-foreground-muted text-sm">כל התיקיות והמסמכים</p>
                </button>
              </div>
            </div>
          )}

          {/* Bottom spacing for mobile nav */}
          <div className="h-28 md:h-8" />
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </AppLayout>
  )
}
