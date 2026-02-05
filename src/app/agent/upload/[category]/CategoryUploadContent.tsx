'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowRight, Shield, Wallet, Car, Upload, Search,
  Menu, Bell, LogOut, User, Settings, X, CloudUpload,
  Check, FileText, Image, File, Mail, Phone, FolderPlus, Eye
} from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import { showSuccess, showError } from '@/lib/swal'

interface Client {
  id: string
  name: string
  email: string
  phone?: string
  createdAt: string
  _count?: {
    folders: number
  }
}

const categoryConfig = {
  insurance: {
    icon: Shield,
    label: 'ביטוח',
    labelEn: 'INSURANCE',
    gradient: 'from-blue-500 to-blue-600',
    bgGradient: 'from-blue-500/20 to-blue-600/10',
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    glow: 'rgba(59, 130, 246, 0.3)',
  },
  finance: {
    icon: Wallet,
    label: 'פיננסים',
    labelEn: 'FINANCE',
    gradient: 'from-purple-500 to-purple-600',
    bgGradient: 'from-purple-500/20 to-purple-600/10',
    iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    glow: 'rgba(168, 85, 247, 0.3)',
  },
  car: {
    icon: Car,
    label: 'רכב',
    labelEn: 'CAR',
    gradient: 'from-emerald-500 to-emerald-600',
    bgGradient: 'from-emerald-500/20 to-emerald-600/10',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    glow: 'rgba(16, 185, 129, 0.3)',
  },
}

export default function CategoryUploadContent({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const resolvedParams = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewAsId = searchParams.get('viewAs')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const category = resolvedParams.category as keyof typeof categoryConfig
  const config = categoryConfig[category] || categoryConfig.insurance

  const notifications = [
    { id: 1, title: 'קובץ הועלה', description: 'הקובץ נוסף בהצלחה', time: 'לפני 2 שעות', isNew: true },
  ]

  useEffect(() => {
    // Wait for session to load before checking role
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user?.role !== 'AGENT' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (session?.user) {
      fetchClients()
    }
  }, [session])

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/users?role=CLIENT')
      if (res.ok) {
        const data = await res.json()
        // Handle both old array format and new paginated format
        setClients(Array.isArray(data) ? data : data.users || [])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone?.includes(searchQuery)
  )

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedClient) return
    await uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    if (!selectedClient) return

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      showError('רק קבצי PDF, PNG ו-JPG מותרים')
      return
    }

    setUploading(true)

    try {
      // First, check if folder exists for this category, if not create one
      let folderId = ''

      // Try to get existing folder or create new one
      const foldersRes = await fetch(`/api/folders?userId=${selectedClient.id}&category=${config.labelEn}`)
      const foldersData = await foldersRes.json()
      // Handle both old array format and new paginated format
      const existingFolders = Array.isArray(foldersData) ? foldersData : foldersData.folders || []

      if (existingFolders.length > 0) {
        folderId = existingFolders[0].id
      } else {
        // Create new folder
        const createFolderRes = await fetch('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: config.label,
            category: config.labelEn,
            userId: selectedClient.id,
          }),
        })

        if (!createFolderRes.ok) {
          throw new Error('שגיאה ביצירת תיקייה')
        }

        const newFolder = await createFolderRes.json()
        folderId = newFolder.id
      }

      // Upload the file
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folderId', folderId)

      const uploadRes = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const error = await uploadRes.json()
        throw new Error(error.error || 'שגיאה בהעלאה')
      }

      // Send notification to client
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: selectedClient.id,
            title: 'מסמך חדש התקבל',
            description: `נוסף מסמך חדש לתיקיית ${config.label}`,
            type: 'FILE_UPLOAD',
          }),
        })
      } catch {
        // Notification failed, but file was uploaded
        console.log('Notification API not available yet')
      }

      // Send email to client
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedClient.email,
            subject: 'מסמך חדש התקבל - מגן פיננסי',
            text: `שלום ${selectedClient.name},\n\nמסמך חדש נוסף לתיקיית ${config.label} שלך.\n\nכניסה למערכת: ${window.location.origin}\n\nבברכה,\nצוות מגן פיננסי`,
          }),
        })
      } catch {
        // Email failed, but file was uploaded
        console.log('Email API not available yet')
      }

      setUploadSuccess(true)
      showSuccess('הקובץ הועלה בהצלחה והלקוח קיבל התראה!')

      // Reset after 3 seconds
      setTimeout(() => {
        setUploadSuccess(false)
        setSelectedClient(null)
      }, 3000)

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
    const file = e.dataTransfer.files?.[0]
    if (file && selectedClient) {
      await uploadFile(file)
    }
  }

  const Icon = config.icon

  if (status === 'loading' || loading) {
    return (
      <AppLayout showHeader={false} showFooter={false}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-foreground-muted">טוען לקוחות...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout showHeader={false} showFooter={false}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative">
        {/* Agent Blue Glow Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-500/12 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[150px]" />
        </div>

        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background-card/80 backdrop-blur-xl border-b border-primary/10">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${config.iconBg} rounded-xl flex items-center justify-center shadow-lg`}
                  style={{ boxShadow: `0 4px 15px ${config.glow}` }}>
                  <Icon size={22} className="text-white" />
                </div>
                <span className={`text-lg font-bold ${config.text}`}>
                  {config.label}
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
                    <div className={`w-8 h-8 ${config.iconBg} rounded-lg flex items-center justify-center text-white text-sm font-bold`}>
                      {session?.user?.name?.charAt(0) || 'A'}
                    </div>
                    <Menu size={20} className="text-foreground" />
                  </button>

                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                      <div className="absolute left-0 mt-2 w-72 bg-background-card rounded-2xl shadow-2xl border border-primary/20 overflow-hidden z-50">
                        <div className={`p-4 border-b border-primary/10 bg-gradient-to-r ${config.bgGradient}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 ${config.iconBg} rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
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
                            onClick={() => router.push('/dashboard')}
                            className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 rounded-xl transition-all text-right"
                          >
                            <User size={20} className="text-primary" />
                            <span>לוח בקרה</span>
                          </button>
                          <button
                            onClick={() => router.push('/agent/clients')}
                            className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 rounded-xl transition-all text-right"
                          >
                            <Settings size={20} className="text-primary" />
                            <span>ניהול לקוחות</span>
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
        <main className="pt-20 pb-8 px-4">
          <div className="max-w-7xl mx-auto">
            {/* Back Button & Title */}
            <div className="mb-8">
              <button
                onClick={() => router.push(viewAsId ? `/agent/clients?viewAs=${viewAsId}` : '/agent/clients')}
                className="flex items-center gap-2 text-foreground-muted hover:text-primary transition-all mb-4 group"
              >
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                <span>חזרה לניהול לקוחות</span>
              </button>

              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 ${config.iconBg} rounded-2xl flex items-center justify-center shadow-lg`}
                  style={{ boxShadow: `0 8px 25px ${config.glow}` }}>
                  <Icon size={32} className="text-white" />
                </div>
                <div>
                  <h1 className={`text-3xl font-bold ${config.text}`}>
                    העלאת קבצים - {config.label}
                  </h1>
                  <p className="text-foreground-muted">
                    {selectedClient ? `נבחר: ${selectedClient.name}` : 'בחר לקוח להעלאת קבצים'}
                  </p>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Side - Client Selection */}
              <div className={`bg-background-card rounded-3xl p-6 border ${config.border}`}>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <User size={24} className={config.text} />
                  בחר לקוח
                </h2>

                {/* Search */}
                <div className="relative mb-6">
                  <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חפש לקוח..."
                    className="w-full pr-12 pl-4 py-3 bg-background rounded-xl border border-primary/20 focus:border-primary/50 focus:outline-none transition-all"
                  />
                </div>

                {/* Client Cards */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {filteredClients.length === 0 ? (
                    <div className="text-center py-8 text-foreground-muted">
                      <User size={48} className="mx-auto mb-4 opacity-50" />
                      <p>לא נמצאו לקוחות</p>
                    </div>
                  ) : (
                    filteredClients.map((client) => (
                      <div
                        key={client.id}
                        className={`p-4 rounded-2xl border-2 transition-all ${
                          selectedClient?.id === client.id
                            ? `${config.border} bg-gradient-to-r ${config.bgGradient}`
                            : 'border-transparent bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div
                          onClick={() => setSelectedClient(client)}
                          className="flex items-center gap-4 cursor-pointer"
                        >
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold ${
                            selectedClient?.id === client.id ? config.iconBg : 'bg-gradient-to-br from-gray-600 to-gray-700'
                          }`}>
                            {client.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-lg">{client.name}</h3>
                            <div className="flex items-center gap-3 text-sm text-foreground-muted">
                              <span className="flex items-center gap-1">
                                <Mail size={14} />
                                {client.email}
                              </span>
                            </div>
                            {client.phone && (
                              <span className="flex items-center gap-1 text-sm text-foreground-muted">
                                <Phone size={14} />
                                {client.phone}
                              </span>
                            )}
                          </div>
                          {selectedClient?.id === client.id && (
                            <div className={`w-8 h-8 ${config.iconBg} rounded-full flex items-center justify-center`}>
                              <Check size={18} className="text-white" />
                            </div>
                          )}
                        </div>
                        {/* View Client Folder Button - appears when selected */}
                        {selectedClient?.id === client.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(viewAsId
                                ? `/agent/clients/${client.id}/folders?viewAs=${viewAsId}`
                                : `/agent/clients/${client.id}/folders`)
                            }}
                            className={`mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl ${config.iconBg} text-white font-medium transition-all hover:opacity-90`}
                          >
                            <Eye size={18} />
                            <span>צפייה במסמכי תיק לקוח</span>
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Side - Upload Area */}
              <div className={`bg-background-card rounded-3xl p-6 border ${config.border}`}>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <CloudUpload size={24} className={config.text} />
                  העלאת קובץ
                </h2>

                {!selectedClient ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                      <div className={`w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${config.bgGradient} flex items-center justify-center`}>
                        <FolderPlus size={48} className={config.text} />
                      </div>
                      <h3 className="text-xl font-bold mb-2">בחר לקוח קודם</h3>
                      <p className="text-foreground-muted">
                        יש לבחור לקוח מהרשימה כדי להעלות קבצים
                      </p>
                    </div>
                  </div>
                ) : uploadSuccess ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center animate-scale-in">
                      <div className={`w-24 h-24 mx-auto mb-4 rounded-full ${config.iconBg} flex items-center justify-center`}>
                        <Check size={48} className="text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2 text-success">הקובץ הועלה בהצלחה!</h3>
                      <p className="text-foreground-muted">
                        {selectedClient.name} יקבל התראה ומייל
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      h-80 border-2 border-dashed rounded-2xl flex items-center justify-center cursor-pointer transition-all
                      ${isDragging
                        ? `${config.border} bg-gradient-to-br ${config.bgGradient} scale-[1.02]`
                        : 'border-primary/30 hover:border-primary/50'
                      }
                    `}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <div className="text-center p-8">
                      <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl ${config.iconBg} flex items-center justify-center ${
                        isDragging ? 'scale-110 animate-bounce' : ''
                      }`}>
                        <CloudUpload size={40} className="text-white" />
                      </div>

                      <h3 className="text-xl font-bold mb-2">
                        {uploading ? 'מעלה...' : isDragging ? 'שחרר כאן' : 'גרור קובץ או לחץ'}
                      </h3>
                      <p className="text-foreground-muted mb-4">
                        PDF, PNG, JPG עד 10MB
                      </p>
                      <p className={`text-sm ${config.text}`}>
                        יועלה ל: {selectedClient.name} - {config.label}
                      </p>

                      {uploading && (
                        <div className="mt-6">
                          <div className="w-48 h-2 bg-primary/20 rounded-full mx-auto overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${config.gradient} rounded-full animate-pulse`} style={{ width: '60%' }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* File Type Icons */}
                <div className="mt-6 flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2 text-sm text-foreground-muted">
                    <div className="p-2 rounded-lg bg-red-500/20">
                      <FileText size={18} className="text-red-400" />
                    </div>
                    <span>PDF</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground-muted">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Image size={18} className="text-blue-400" />
                    </div>
                    <span>PNG / JPG</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </AppLayout>
  )
}
