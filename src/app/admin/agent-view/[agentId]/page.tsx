'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Users, FolderOpen, FileText, TrendingUp, ArrowUpRight, ArrowRight,
  Bell, Eye, Clock, Menu, LogOut, Home, Settings
} from 'lucide-react'
import { AppLayout } from '@/components/layout'

interface AgentData {
  id: string
  name: string
  email: string
  phone: string | null
}

interface Stats {
  clients: number
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
  }
}

export default function AgentViewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const agentId = params.agentId as string

  const [agent, setAgent] = useState<AgentData | null>(null)
  const [stats, setStats] = useState<Stats>({ clients: 0, folders: 0, files: 0 })
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Wait for session to load before checking role
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (session?.user && agentId) {
      fetchAgentData()
    }
  }, [session, agentId])

  const fetchAgentData = async () => {
    try {
      // Fetch agent info
      const agentRes = await fetch(`/api/users/${agentId}`)
      if (agentRes.ok) {
        const agentData = await agentRes.json()
        setAgent(agentData)
      }

      // Fetch agent's clients
      const clientsRes = await fetch(`/api/users?role=CLIENT&agentId=${agentId}`)
      if (clientsRes.ok) {
        const clientsData = await clientsRes.json()
        setStats(prev => ({ ...prev, clients: clientsData.length }))

        // Calculate folders and files from clients
        let totalFolders = 0
        let totalFiles = 0
        clientsData.forEach((client: { _count?: { folders: number } }) => {
          totalFolders += client._count?.folders || 0
        })

        // Fetch folders for this agent's clients
        const foldersRes = await fetch(`/api/folders?agentId=${agentId}`)
        if (foldersRes.ok) {
          const foldersData = await foldersRes.json()
          const folders = Array.isArray(foldersData) ? foldersData : foldersData.folders || []
          totalFolders = folders.length
          totalFiles = folders.reduce(
            (acc: number, f: { _count?: { files: number } }) => acc + (f._count?.files || 0),
            0
          )
        }

        setStats(prev => ({
          ...prev,
          folders: totalFolders,
          files: totalFiles,
        }))
      }
    } catch (error) {
      console.error('Error fetching agent data:', error)
    } finally {
      setLoading(false)
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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-mesh">
        <div className="text-center animate-fade-in">
          <div className="loading-spinner mx-auto mb-4" />
          <p className="text-foreground-muted">טוען נתוני סוכן...</p>
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-foreground-muted">סוכן לא נמצא</p>
          <button
            onClick={() => router.push('/admin/agents')}
            className="mt-4 text-primary hover:underline"
          >
            חזור לניהול סוכנים
          </button>
        </div>
      </div>
    )
  }

  return (
    <AppLayout showHeader={false} showFooter={false}>
      <div className="min-h-screen overflow-x-hidden relative bg-mesh bg-grid bg-background">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b bg-background/90 border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Back Button & Title */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/admin/agents')}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all"
                >
                  <ArrowRight size={24} />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-primary">
                    צפייה בסוכן: {agent.name}
                  </h1>
                  <p className="text-xs text-foreground-muted">מצב צפייה למנהל</p>
                </div>
              </div>

              {/* Agent Info Badge */}
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                  {agent.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium">{agent.name}</p>
                  <p className="text-xs text-foreground-muted">{agent.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Admin Notice Banner */}
        <div className="fixed top-16 left-0 right-0 z-40 bg-amber-500/20 border-b border-amber-500/30">
          <div className="max-w-7xl mx-auto px-4 py-2 text-center">
            <p className="text-sm text-amber-400">
              <Eye size={14} className="inline ml-2" />
              אתה צופה בעמוד הסוכן כמנהל - זה מה שהסוכן רואה
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 pt-32 pb-6 relative z-10">
          {/* Header Section */}
          <div className="flex items-start justify-between mb-8 animate-fade-in-up">
            <div>
              <p className="text-foreground-muted text-sm mb-1">דשבורד סוכן</p>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                שלום, <span className="text-gradient">{agent.name}</span>
              </h1>
              <p className="text-foreground-subtle text-sm">תצוגת סוכן</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 md:gap-6 mb-8 animate-fade-in-up">
            <div className="glass-card rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                  <Users size={20} className="text-primary" />
                </div>
                <span className="text-success text-xs flex items-center gap-1">
                  <TrendingUp size={12} />
                  פעיל
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-foreground">{stats.clients}</div>
              <div className="text-foreground-subtle text-xs md:text-sm">לקוחות</div>
            </div>

            <div className="glass-card rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5">
                  <FolderOpen size={20} className="text-accent" />
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-foreground">{stats.folders}</div>
              <div className="text-foreground-subtle text-xs md:text-sm">תיקיות</div>
            </div>

            <div className="glass-card rounded-2xl p-4 md:p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5">
                  <FileText size={20} className="text-secondary" />
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-foreground">{stats.files}</div>
              <div className="text-foreground-subtle text-xs md:text-sm">קבצים</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <span className="w-1 h-5 bg-gradient-to-b from-primary to-secondary rounded-full" />
              פעולות מהירות (לסוכן)
            </h2>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <button
                onClick={() => router.push(`/agent/clients?agentId=${agentId}`)}
                className="glass-card p-4 md:p-6 rounded-2xl text-right hover:border-primary/30 transition-all group"
              >
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <ArrowUpRight size={18} className="text-foreground-muted group-hover:text-primary transition-colors md:hidden" />
                  <ArrowUpRight size={20} className="text-foreground-muted group-hover:text-primary transition-colors hidden md:block" />
                  <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-primary to-primary-dark">
                    <Users size={20} className="text-white md:hidden" />
                    <Users size={24} className="text-white hidden md:block" />
                  </div>
                </div>
                <h4 className="font-bold text-sm md:text-lg mb-1">ניהול לקוחות</h4>
                <p className="text-foreground-muted text-xs md:text-sm">צפה בלקוחות הסוכן</p>
              </button>

              <button
                onClick={() => router.push(`/agent/clients?agentId=${agentId}`)}
                className="glass-card p-4 md:p-6 rounded-2xl text-right hover:border-accent/30 transition-all group"
              >
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <ArrowUpRight size={18} className="text-foreground-muted group-hover:text-accent transition-colors md:hidden" />
                  <ArrowUpRight size={20} className="text-foreground-muted group-hover:text-accent transition-colors hidden md:block" />
                  <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-accent to-accent-dark">
                    <FolderOpen size={20} className="text-white md:hidden" />
                    <FolderOpen size={24} className="text-white hidden md:block" />
                  </div>
                </div>
                <h4 className="font-bold text-sm md:text-lg mb-1">צפה בתיקים</h4>
                <p className="text-foreground-muted text-xs md:text-sm">כל התיקיות והמסמכים</p>
              </button>
            </div>
          </div>

          {/* Agent Info Card */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <span className="w-1 h-5 bg-gradient-to-b from-accent to-secondary rounded-full" />
              פרטי הסוכן
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-foreground-subtle text-xs mb-1">שם</p>
                <p className="font-medium">{agent.name}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-foreground-subtle text-xs mb-1">אימייל</p>
                <p className="font-medium" dir="ltr">{agent.email}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-foreground-subtle text-xs mb-1">טלפון</p>
                <p className="font-medium" dir="ltr">{agent.phone || '-'}</p>
              </div>
            </div>
          </div>

          {/* Bottom spacing */}
          <div className="h-8" />
        </div>
      </div>
    </AppLayout>
  )
}
