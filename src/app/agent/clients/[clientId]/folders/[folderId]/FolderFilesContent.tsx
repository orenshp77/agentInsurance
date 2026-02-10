'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  Upload,
  Trash2,
  FileText,
  Image,
  File,
  Download,
  Edit3,
  Eye,
  Menu,
  X,
  Bell,
  LogOut,
  User,
  Settings,
  Shield,
  CloudUpload,
  FolderOpen
} from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { showSuccess, showError, showConfirm } from '@/lib/swal'

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
  category: string
  user: {
    id: string
    name: string
    email: string
  }
  files: FileItem[]
}

interface ViewAsUser {
  id: string
  name: string
  email: string
  role: string
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
      return 'text-red-500 bg-red-500/10'
    case 'PNG':
    case 'JPG':
    case 'JPEG':
      return 'text-blue-500 bg-blue-500/10'
    default:
      return 'text-gray-500 bg-gray-500/10'
  }
}

// Get proxy URL for file (to bypass CORS issues with GCS)
const getFileProxyUrl = (file: FileItem) => {
  // If URL is already a full URL (http/https), use it directly
  if (file.url.startsWith('http')) {
    return file.url
  }
  // Otherwise, use the proxy endpoint
  return `/api/file-proxy?filename=${encodeURIComponent(file.url)}`
}

export default function FolderFilesContent({
  params,
}: {
  params: Promise<{ clientId: string; folderId: string }>
}) {
  const resolvedParams = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewAsId = searchParams.get('viewAs')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [folder, setFolder] = useState<Folder | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [editingFile, setEditingFile] = useState<FileItem | null>(null)
  const [notes, setNotes] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [viewAsUser, setViewAsUser] = useState<ViewAsUser | null>(null)

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

  const notifications = [
    { id: 1, title: 'קובץ הועלה', description: 'הקובץ נוסף בהצלחה', time: 'לפני 2 שעות', isNew: true },
    { id: 2, title: 'עדכון מערכת', description: 'גרסה חדשה זמינה', time: 'לפני יום', isNew: false },
  ]

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

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    if (!session?.user) return

    const interval = setInterval(() => {
      fetchFolder()
    }, 30000)

    return () => clearInterval(interval)
  }, [session, resolvedParams.folderId])

  const fetchFolder = async () => {
    try {
      const res = await fetch(`/api/folders/${resolvedParams.folderId}`)
      if (!res.ok) {
        setFolder(null)
        return
      }
      const data = await res.json()
      setFolder(data)
    } catch (error) {
      showError('שגיאה בטעינת התיקייה')
      console.error(error)
      setFolder(null)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    for (const file of Array.from(files)) {
      await uploadFile(file)
    }
  }

  const uploadFile = async (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      showError('רק קבצי PDF, PNG ו-JPG מותרים')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folderId', resolvedParams.folderId)

      const res = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'שגיאה בהעלאה')
      }

      showSuccess('הקובץ הועלה בהצלחה')
      fetchFolder()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'שגיאה בהעלאת הקובץ')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        await uploadFile(file)
      }
    }
  }

  const handleDeleteFile = async (file: FileItem) => {
    const confirmed = await showConfirm(
      'מחיקת קובץ',
      `האם אתה בטוח שברצונך למחוק את "${file.fileName}"?`
    )

    if (!confirmed) return

    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('שגיאה במחיקה')
      }

      showSuccess('הקובץ נמחק בהצלחה')
      fetchFolder()
    } catch (error) {
      showError('שגיאה במחיקת הקובץ')
      console.error(error)
    }
  }

  const handleUpdateNotes = async () => {
    if (!editingFile) return

    try {
      const res = await fetch(`/api/files/${editingFile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })

      if (!res.ok) {
        throw new Error('שגיאה בעדכון')
      }

      showSuccess('ההערות עודכנו בהצלחה')
      setEditingFile(null)
      fetchFolder()
    } catch (error) {
      showError('שגיאה בעדכון ההערות')
      console.error(error)
    }
  }

  const openEditNotes = (file: FileItem) => {
    setEditingFile(file)
    setNotes(file.notes || '')
  }

  if (status === 'loading' || loading) {
    return (
      <AppLayout showHeader={false} showFooter={false}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-foreground-muted">טוען קבצים...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!folder) {
    return (
      <AppLayout showHeader={false} showFooter={false}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
          <div className="text-center bg-background-card p-8 rounded-3xl border border-error/20">
            <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen size={40} className="text-error" />
            </div>
            <h2 className="text-xl font-bold text-error mb-2">התיקייה לא נמצאה</h2>
            <p className="text-foreground-muted mb-6">התיקייה שחיפשת לא קיימת או שאין לך גישה אליה</p>
            <Button
              variant="primary"
              onClick={() => router.push(`/agent/clients/${resolvedParams.clientId}/folders${viewAsId ? `?viewAs=${viewAsId}` : ''}`)}
            >
              <ArrowRight size={18} className="ml-2" />
              חזרה לתיקיות
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Handle back navigation - preserve viewAs context
  const handleGoBack = () => {
    if (viewAsId) {
      router.push(`/agent/clients/${resolvedParams.clientId}/folders?viewAs=${viewAsId}`)
    } else {
      router.push(`/agent/clients/${resolvedParams.clientId}/folders`)
    }
  }

  return (
    <AppLayout showHeader={false} showFooter={false}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative">
        {/* Admin Viewing As Banner */}
        {isViewingAs && viewAsUser && (
          <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-amber-500 to-orange-500 py-1 md:py-2 px-3 md:px-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 md:gap-4 text-black font-medium text-xs md:text-base min-w-0">
                <Eye size={14} className="shrink-0 md:w-[18px] md:h-[18px]" />
                <span className="truncate">צופים: {viewAsUser.name}</span>
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

        {/* Agent Blue Glow Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-500/12 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[150px]" />
        </div>

        {/* Modern Header */}
        <header className={`fixed left-0 right-0 z-50 bg-background-card/80 backdrop-blur-xl border-b border-primary/10 ${isViewingAs ? 'top-10' : 'top-0'}`}>
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <Shield size={22} className="text-white" />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent hidden sm:block">
                  מגן פיננסי
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
                    {notifications.some(n => n.isNew) && (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-error rounded-full border-2 border-background-card"></span>
                    )}
                  </button>

                  {showNotifications && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                      <div className="absolute left-0 mt-2 w-80 bg-background-card rounded-2xl shadow-2xl border border-primary/20 overflow-hidden z-50">
                        <div className="p-4 border-b border-primary/10">
                          <h3 className="font-bold text-lg">התראות</h3>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`p-4 border-b border-primary/5 hover:bg-primary/5 transition-all ${
                                notif.isNew ? 'bg-primary/5' : ''
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {notif.isNew && (
                                  <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                                )}
                                <div className={notif.isNew ? '' : 'mr-5'}>
                                  <p className="font-medium">{notif.title}</p>
                                  <p className="text-sm text-foreground-muted">{notif.description}</p>
                                  <p className="text-xs text-foreground-muted mt-1">{notif.time}</p>
                                </div>
                              </div>
                            </div>
                          ))}
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
                        <div className="p-4 border-b border-primary/10 bg-gradient-to-r from-primary/10 to-accent/10">
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
                            <User size={20} className="text-primary" />
                            <span>לוח בקרה</span>
                          </button>
                          <button
                            onClick={() => router.push(viewAsId ? `/settings?viewAs=${viewAsId}` : '/settings')}
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

        {/* Main Content */}
        <main className={`pb-8 px-4 ${isViewingAs ? 'pt-28' : 'pt-20'}`}>
          <div className="max-w-7xl mx-auto">
            {/* Back Button & Title Section */}
            <div className="mb-8">
              <button
                onClick={handleGoBack}
                className="flex items-center gap-2 text-foreground-muted hover:text-primary transition-all mb-4 group"
              >
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                <span>חזרה לתיקיות</span>
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                      <FolderOpen size={24} className="text-primary" />
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {folder?.name}
                      </h1>
                      <p className="text-foreground-muted">
                        {folder?.user?.name} • {folder?.files?.length || 0} קבצים
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Zone */}
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative mb-8 border-2 border-dashed rounded-3xl p-8 transition-all duration-300 cursor-pointer
                ${isDragging
                  ? 'border-primary bg-primary/10 scale-[1.02]'
                  : 'border-primary/30 bg-background-card hover:border-primary/50 hover:bg-primary/5'
                }
              `}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="text-center">
                <div className={`
                  w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all
                  ${isDragging ? 'bg-primary/20 scale-110' : 'bg-primary/10'}
                `}>
                  <CloudUpload size={40} className={`${isDragging ? 'text-primary animate-bounce' : 'text-primary'}`} />
                </div>

                <h3 className="text-xl font-bold mb-2">
                  {uploading ? 'מעלה קבצים...' : isDragging ? 'שחרר כאן' : 'גרור קבצים או לחץ להעלאה'}
                </h3>
                <p className="text-foreground-muted">
                  PDF, PNG, JPG עד 10MB
                </p>

                {uploading && (
                  <div className="mt-4">
                    <div className="w-48 h-2 bg-primary/20 rounded-full mx-auto overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Files Grid */}
            {folder.files.length === 0 ? (
              <div className="bg-background-card rounded-3xl p-12 text-center border border-primary/10">
                <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <FolderOpen size={48} className="text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">התיקייה ריקה</h3>
                <p className="text-foreground-muted mb-6">
                  העלה קבצים כדי להתחיל
                </p>
                <Button
                  variant="accent"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={20} className="ml-2" />
                  העלה קובץ ראשון
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {folder.files.map((file) => {
                  const Icon = getFileIcon(file.fileType)
                  const colorClass = getFileColor(file.fileType)
                  return (
                    <div
                      key={file.id}
                      className="bg-background-card rounded-2xl overflow-hidden border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 group"
                    >
                      {/* Preview Area */}
                      {['PNG', 'JPG', 'JPEG'].includes(file.fileType.toUpperCase()) ? (
                        <div
                          className="relative h-40 overflow-hidden cursor-pointer"
                          onClick={() => setPreviewFile(file)}
                        >
                          <img
                            src={getFileProxyUrl(file)}
                            alt={file.fileName}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                            <span className="text-white text-sm flex items-center gap-1">
                              <Eye size={16} />
                              צפה בתמונה
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="h-40 flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 cursor-pointer"
                          onClick={() => window.open(getFileProxyUrl(file), '_blank')}
                        >
                          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${colorClass}`}>
                            <Icon size={40} />
                          </div>
                        </div>
                      )}

                      {/* File Info */}
                      <div className="p-4">
                        <h3 className="font-bold truncate mb-1" title={file.fileName}>
                          {file.fileName}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-foreground-muted mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                            {file.fileType}
                          </span>
                        </div>
                        <p className="text-xs text-foreground-muted mb-3">
                          המסמך עלה בתאריך: {new Date(file.createdAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })} {new Date(file.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </p>

                        {file.notes && (
                          <div className="mb-3 p-2 bg-primary/5 rounded-lg text-sm text-foreground-muted line-clamp-2">
                            {file.notes}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1 pt-2 border-t border-primary/10">
                          <button
                            onClick={() => window.open(getFileProxyUrl(file), '_blank')}
                            className="flex-1 flex items-center justify-center gap-1 p-2 hover:bg-success/10 rounded-lg transition-all text-success text-sm"
                            title="צפה"
                          >
                            <Eye size={16} />
                            <span className="hidden sm:inline">צפה</span>
                          </button>
                          <a
                            href={getFileProxyUrl(file)}
                            download={file.fileName}
                            className="flex-1 flex items-center justify-center gap-1 p-2 hover:bg-primary/10 rounded-lg transition-all text-primary text-sm"
                            title="הורד"
                          >
                            <Download size={16} />
                            <span className="hidden sm:inline">הורד</span>
                          </a>
                          <button
                            onClick={() => openEditNotes(file)}
                            className="flex-1 flex items-center justify-center gap-1 p-2 hover:bg-accent/10 rounded-lg transition-all text-accent text-sm"
                            title="הערות"
                          >
                            <Edit3 size={16} />
                            <span className="hidden sm:inline">הערות</span>
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file)}
                            className="p-2 hover:bg-error/10 rounded-lg transition-all text-error"
                            title="מחק"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>

        {/* Notes Modal */}
        <Modal
          isOpen={!!editingFile}
          onClose={() => setEditingFile(null)}
          title="עריכת הערות"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl">
              <div className={`p-2 rounded-lg ${getFileColor(editingFile?.fileType || '')}`}>
                {editingFile && (() => {
                  const Icon = getFileIcon(editingFile.fileType)
                  return <Icon size={24} />
                })()}
              </div>
              <p className="font-medium truncate">{editingFile?.fileName}</p>
            </div>
            <Input
              label="הערות"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הוסף הערות לקובץ..."
            />
            <div className="flex gap-3">
              <Button variant="accent" onClick={handleUpdateNotes} className="flex-1">
                שמור הערות
              </Button>
              <Button
                variant="ghost"
                onClick={() => setEditingFile(null)}
                className="flex-1"
              >
                ביטול
              </Button>
            </div>
          </div>
        </Modal>

        {/* Image Preview Modal */}
        {previewFile && ['PNG', 'JPG', 'JPEG'].includes(previewFile.fileType.toUpperCase()) && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setPreviewFile(null)}
          >
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
            >
              <X size={24} className="text-white" />
            </button>
            <img
              src={getFileProxyUrl(previewFile)}
              alt={previewFile.fileName}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/10 backdrop-blur-xl rounded-full px-4 py-2">
              <span className="text-white text-sm">{previewFile.fileName}</span>
              <a
                href={getFileProxyUrl(previewFile)}
                download={previewFile.fileName}
                className="p-2 hover:bg-white/20 rounded-full transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={18} className="text-white" />
              </a>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
