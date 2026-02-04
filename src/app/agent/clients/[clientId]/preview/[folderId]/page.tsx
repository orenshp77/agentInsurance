'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, FileText, Image, File, Download, Mail, MessageCircle,
  Eye, Shield, Wallet, Car, Clock, Files, Phone, Sparkles, ChevronLeft,
  Menu, Bell, LogOut, Home, FolderOpen, Settings, PhoneCall, ImageOff, ImageIcon
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { AppLayout } from '@/components/layout'
import { showError } from '@/lib/swal'

interface FileItem {
  id: string
  url: string
  fileType: string
  fileName: string
  notes: string | null
  createdAt: string
}

interface Folder {
  id: string
  name: string
  category: 'INSURANCE' | 'FINANCE' | 'CAR'
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    phone?: string
    agentId: string | null
  }
  files: FileItem[]
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

const getFileIcon = (fileType: string) => {
  switch (fileType.toUpperCase()) {
    case 'PDF':
      return FileText
    case 'PNG':
    case 'JPG':
    case 'JPEG':
      return Image
    default:
      return File
  }
}

const getFileColor = (fileType: string) => {
  switch (fileType.toUpperCase()) {
    case 'PDF':
      return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' }
    case 'PNG':
    case 'JPG':
    case 'JPEG':
      return { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' }
    default:
      return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' }
  }
}

// Background landscape images
const landscapeImages = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80',
  'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1920&q=80',
]

export default function PreviewFolderFilesPage({
  params,
}: {
  params: Promise<{ clientId: string; folderId: string }>
}) {
  const resolvedParams = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [folder, setFolder] = useState<Folder | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showBackground, setShowBackground] = useState(true)
  const [currentBgIndex, setCurrentBgIndex] = useState(0)

  // Rotate background images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % landscapeImages.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchFolder()
    }
  }, [session, resolvedParams.folderId])

  const fetchFolder = async () => {
    try {
      const res = await fetch(`/api/folders/${resolvedParams.folderId}`)
      if (!res.ok) {
        throw new Error('Folder not found')
      }
      const data = await res.json()
      setFolder(data)
    } catch (error) {
      showError('שגיאה בטעינת התיקייה')
      console.error(error)
      router.push(`/agent/clients/${resolvedParams.clientId}/preview`)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (status === 'loading' || loading) {
    return (
      <AppLayout showHeader={false} showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-foreground-muted animate-pulse">טוען מסמכים...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!folder) {
    return (
      <AppLayout showHeader={false} showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="glass-card rounded-3xl p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-error/20 flex items-center justify-center">
              <FileText size={40} className="text-error" />
            </div>
            <h2 className="text-xl font-bold text-error mb-2">התיקייה לא נמצאה</h2>
            <button
              onClick={() => router.push(`/agent/clients/${resolvedParams.clientId}/preview`)}
              className="mt-4 px-6 py-2 rounded-xl bg-primary text-white"
            >
              חזור לתצוגת לקוח
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const config = categoryConfig[folder.category]
  const CategoryIcon = config.icon

  return (
    <AppLayout showHeader={false} showFooter={false}>
      <div className="min-h-screen pb-24 md:pb-8 relative overflow-hidden">
        {/* Client Landscape Background - Full Screen */}
        {showBackground && (
          <div className="fixed inset-0 z-0">
            {landscapeImages.map((img, index) => (
              <img
                key={index}
                src={img}
                alt="landscape"
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms]"
                style={{ opacity: index === currentBgIndex ? 1 : 0 }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0d1117]/70 via-[#0d1117]/85 to-[#0d1117]" />
          </div>
        )}

        {/* Background Toggle Button */}
        <button
          onClick={() => setShowBackground(!showBackground)}
          className="fixed bottom-24 left-4 z-50 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all md:bottom-8"
          title={showBackground ? 'כבה רקע' : 'הפעל רקע'}
        >
          {showBackground ? (
            <ImageOff size={20} className="text-white" />
          ) : (
            <ImageIcon size={20} className="text-white" />
          )}
        </button>

        {/* Fixed Header with Preview Banner */}
        <header className="fixed top-0 left-0 right-0 z-50">
          {/* Preview Banner */}
          <div className="bg-gradient-to-r from-accent to-secondary text-white text-center py-2 px-4">
            <div className="flex items-center justify-center gap-3">
              <Eye size={18} />
              <span className="font-medium text-sm">מצב תצוגה כלקוח - {folder.user.name}</span>
              <button
                onClick={() => router.push(`/agent/clients/${resolvedParams.clientId}/folders`)}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-all text-sm"
              >
                <ArrowRight size={16} />
                חזור לניהול
              </button>
            </div>
          </div>

          {/* Main Header */}
          <div className="bg-[#0d1117]/90 backdrop-blur-md border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/agent/clients/${resolvedParams.clientId}/preview`)}>
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
                    </button>

                    {showNotifications && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                        <div className="absolute left-0 top-full mt-2 w-80 bg-[#0d1117] border-2 border-[#30363d] rounded-2xl p-4 z-50 shadow-[0_8px_40px_rgba(0,0,0,0.8)]">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                              <Bell size={18} className="text-primary" />
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
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center text-white font-bold">
                        {folder.user.name?.charAt(0)}
                      </div>
                      <Menu size={20} className="text-foreground-muted" />
                    </button>

                    {showMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                        <div className="absolute left-0 top-full mt-2 w-72 bg-[#0d1117] border-2 border-[#30363d] rounded-2xl p-4 z-50 shadow-[0_8px_40px_rgba(0,0,0,0.8)]">
                          {/* User Info */}
                          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center text-white font-bold text-lg">
                              {folder.user.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold">{folder.user.name}</p>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-accent to-secondary text-white">
                                לקוח
                              </span>
                            </div>
                          </div>

                          {/* Menu Items */}
                          <button
                            onClick={() => {
                              router.push(`/agent/clients/${resolvedParams.clientId}/preview`)
                              setShowMenu(false)
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all text-right"
                          >
                            <div className="p-2 rounded-lg bg-primary/20">
                              <Home size={18} className="text-primary" />
                            </div>
                            <span>תצוגת לקוח</span>
                          </button>

                          <button
                            onClick={() => {
                              router.push(`/agent/clients/${resolvedParams.clientId}/folders`)
                              setShowMenu(false)
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all text-right"
                          >
                            <div className="p-2 rounded-lg bg-accent/20">
                              <FolderOpen size={18} className="text-accent" />
                            </div>
                            <span>חזור לניהול</span>
                          </button>

                          <button
                            onClick={() => window.open(`https://wa.me/${folder.user.phone?.replace(/\D/g, '')}`, '_blank')}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all text-right"
                          >
                            <div className="p-2 rounded-lg bg-green-500/20">
                              <PhoneCall size={18} className="text-green-400" />
                            </div>
                            <span>וואטסאפ ללקוח</span>
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
          </div>
        </header>

        {/* Hero Header */}
        <div className="relative overflow-hidden pt-24">
          <div className="relative max-w-7xl mx-auto px-4 py-6 md:py-10">
            {/* Back Button */}
            <button
              onClick={() => router.push(`/agent/clients/${resolvedParams.clientId}/preview`)}
              className="flex items-center gap-2 text-foreground-muted hover:text-foreground mb-6 transition-colors group"
            >
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              <span>חזרה לתיקיות</span>
            </button>

            {/* Folder Info */}
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Icon */}
              <div className={`w-20 h-20 rounded-2xl ${config.iconBg} flex items-center justify-center shadow-lg`}
                style={{ boxShadow: `0 8px 32px ${config.glow}` }}>
                <CategoryIcon size={40} className="text-white" />
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.iconBg} text-white`}>
                    {config.label}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">{folder.name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-muted">
                  <div className="flex items-center gap-1">
                    <Files size={16} />
                    <span>{folder.files.length} מסמכים</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={16} />
                    <span>{formatDate(folder.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="flex gap-2">
                <button
                  onClick={() => window.open(`https://wa.me/${folder.user.phone?.replace(/\D/g, '')}`, '_blank')}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-all"
                >
                  <MessageCircle size={20} />
                  <span className="hidden md:inline">וואטסאפ</span>
                </button>
                <button
                  onClick={() => window.location.href = `mailto:${folder.user.email}`}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-all"
                >
                  <Mail size={20} />
                  <span className="hidden md:inline">אימייל</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Files Content */}
        <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
          {folder.files.length === 0 ? (
            /* Empty State */
            <div className="glass-card rounded-3xl p-12 text-center animate-fade-in-up">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Files size={48} className="text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">אין מסמכים בתיקייה</h2>
              <p className="text-foreground-muted mb-6 max-w-md mx-auto">
                הסוכן יוסיף מסמכים לתיקייה זו בקרוב
              </p>
            </div>
          ) : (
            /* Files Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {folder.files.map((file, index) => {
                const Icon = getFileIcon(file.fileType)
                const fileColor = getFileColor(file.fileType)
                const isImage = ['PNG', 'JPG', 'JPEG'].includes(file.fileType.toUpperCase())
                const isPdf = file.fileType.toUpperCase() === 'PDF'

                return (
                  <div
                    key={file.id}
                    className="glass-card rounded-2xl overflow-hidden group hover:scale-[1.02] transition-all duration-300 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {/* Image Preview */}
                    {isImage && (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block relative h-40 overflow-hidden"
                      >
                        <img
                          src={file.url}
                          alt={file.fileName}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                          <span className="text-white text-sm flex items-center gap-1">
                            <Eye size={16} />
                            לחץ לצפייה
                          </span>
                        </div>
                      </a>
                    )}

                    {/* File Content */}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        {/* File Icon */}
                        <div className={`p-3 rounded-xl ${fileColor.bg} ${fileColor.border} border`}>
                          <Icon size={24} className={fileColor.text} />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1">
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-success/20 transition-all"
                            title="צפה"
                          >
                            <Eye size={18} className="text-success" />
                          </a>
                          <a
                            href={file.url}
                            download={file.fileName}
                            className="p-2 rounded-lg hover:bg-primary/20 transition-all"
                            title="הורד"
                          >
                            <Download size={18} className="text-primary" />
                          </a>
                        </div>
                      </div>

                      {/* File Info */}
                      <h3 className="font-bold text-foreground mb-1 truncate" title={file.fileName}>
                        {file.fileName}
                      </h3>
                      <p className="text-sm text-foreground-muted flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${fileColor.bg} ${fileColor.text}`}>
                          {file.fileType}
                        </span>
                        <span>{formatDate(file.createdAt)}</span>
                      </p>

                      {/* Notes */}
                      {file.notes && (
                        <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
                          <p className="text-sm text-foreground-muted">{file.notes}</p>
                        </div>
                      )}

                      {/* PDF View Button */}
                      {isPdf && (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 text-red-400 hover:from-red-500/30 hover:to-orange-500/30 transition-all group"
                        >
                          <Eye size={18} />
                          <span>פתח מסמך PDF</span>
                          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </AppLayout>
  )
}
