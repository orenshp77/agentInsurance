'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ArrowRight, Menu, Bell, LogOut, Home, Users, Settings, LogIn, Eye, Copy, AlertTriangle, Image, Search } from 'lucide-react'
import { signOut } from 'next-auth/react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import { AppLayout } from '@/components/layout'
import MobileNav from '@/components/layout/MobileNav'
import { showSuccess, showError, showConfirm } from '@/lib/swal'
import ImageCropper, { ImageCropperRef } from '@/components/ui/ImageCropper'
import { withFreshCacheBust } from '@/lib/utils'

interface Agent {
  id: string
  email: string
  name: string
  phone: string | null
  idNumber: string | null
  role: string
  createdAt: string
  logoUrl?: string | null
  _count: {
    clients: number
  }
}

interface Client {
  id: string
  email: string
  name: string
  phone: string | null
  idNumber: string | null
  role: string
  createdAt: string
  agent?: {
    id: string
    name: string
  }
}

export default function AdminAgentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'agents' | 'clients'>('agents')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    idNumber: '',
  })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null)
  const imageCropperRef = useRef<ImageCropperRef>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [orphanedClientsCount, setOrphanedClientsCount] = useState(0)
  const [agentSearchQuery, setAgentSearchQuery] = useState('')

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
    fetchAgents()
    fetchClients()
    fetchOrphanedClientsCount()
  }, [])

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAgents()
      fetchClients()
      fetchOrphanedClientsCount()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const fetchOrphanedClientsCount = async () => {
    try {
      const res = await fetch(`/api/orphaned-clients?_t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        setOrphanedClientsCount(data.totalCount || 0)
      }
    } catch (error) {
      console.error('Error fetching orphaned clients:', error)
    }
  }

  const fetchAgents = async () => {
    try {
      const res = await fetch(`/api/users?role=AGENT&_t=${Date.now()}`)
      const data = await res.json()
      // Handle both old array format and new paginated format
      setAgents(Array.isArray(data) ? data : data.users || [])
    } catch (error) {
      showError('שגיאה בטעינת הסוכנים')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const res = await fetch(`/api/users?role=CLIENT&_t=${Date.now()}`)
      const data = await res.json()
      // Handle both old array format and new paginated format
      setClients(Array.isArray(data) ? data : data.users || [])
    } catch (error) {
      showError('שגיאה בטעינת הלקוחות')
      console.error(error)
    }
  }

  const handleImageCropped = (croppedImageUrl: string, file: File) => {
    setLogoPreview(croppedImageUrl)
    setLogoFile(file)
    setExistingLogoUrl(null)
  }

  const handleRemoveLogo = () => {
    setLogoPreview(null)
    setLogoFile(null)
    setExistingLogoUrl(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Check if there's a pending image in the cropper and crop it first
      let fileToUpload = logoFile
      if (imageCropperRef.current?.hasPendingImage()) {
        const croppedFile = await imageCropperRef.current.triggerCrop()
        if (croppedFile) {
          fileToUpload = croppedFile
        }
      }

      // Upload the logo if exists
      let logoUrl = existingLogoUrl
      if (fileToUpload) {
        const logoFormData = new FormData()
        logoFormData.append('file', fileToUpload)
        logoFormData.append('type', 'logo')
        // When editing an agent, send the agent's ID so the logo is saved to the agent's record
        if (editingAgent) {
          logoFormData.append('userId', editingAgent.id)
        }

        const uploadRes = await fetch('/api/upload-logo', {
          method: 'POST',
          body: logoFormData,
        })

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          logoUrl = uploadData.url
        }
      }

      const url = editingAgent ? `/api/users/${editingAgent.id}` : '/api/users'
      const method = editingAgent ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          role: 'AGENT',
          logoUrl,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'שגיאה')
      }

      showSuccess(editingAgent ? 'הסוכן עודכן בהצלחה' : 'הסוכן נוסף בהצלחה')
      setIsModalOpen(false)
      resetForm()
      fetchAgents()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'שגיאה בשמירת הסוכן')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (agent: Agent) => {
    const clientCount = agent._count?.clients || 0
    let confirmMessage = `האם אתה בטוח שברצונך למחוק את ${agent.name}?`

    if (clientCount > 0) {
      confirmMessage = `לסוכן ${agent.name} יש ${clientCount} לקוחות.\n\nאם תמחק את הסוכן, הלקוחות יועברו ל"לקוחות ממתינים לשיוך" ותוכל לשייך אותם לסוכן אחר או למחוק אותם.`
    }

    const confirmed = await showConfirm('מחיקת סוכן', confirmMessage)

    if (!confirmed) return

    try {
      const res = await fetch(`/api/users/${agent.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('שגיאה במחיקה')
      }

      const data = await res.json()

      if (data.orphanedClients > 0) {
        showSuccess(`הסוכן נמחק. ${data.orphanedClients} לקוחות הועברו לרשימת הממתינים.`)
        fetchOrphanedClientsCount()
      } else {
        showSuccess('הסוכן נמחק בהצלחה')
      }

      fetchAgents()
    } catch (error) {
      showError('שגיאה במחיקת הסוכן')
      console.error(error)
    }
  }

  const handleDeleteClient = async (client: Client) => {
    const confirmed = await showConfirm(
      'מחיקת לקוח',
      `האם אתה בטוח שברצונך למחוק את ${client.name}?`
    )

    if (!confirmed) return

    try {
      const res = await fetch(`/api/users/${client.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('שגיאה במחיקה')
      }

      showSuccess('הלקוח נמחק בהצלחה')
      fetchClients()
    } catch (error) {
      showError('שגיאה במחיקת הלקוח')
      console.error(error)
    }
  }

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent)
    setFormData({
      email: agent.email,
      password: '',
      name: agent.name,
      phone: agent.phone || '',
      idNumber: agent.idNumber || '',
    })
    setLogoPreview(null)
    setLogoFile(null)
    setExistingLogoUrl(agent.logoUrl || null)
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setEditingAgent(null)
    setFormData({ email: '', password: '', name: '', phone: '', idNumber: '' })
    setLogoPreview(null)
    setLogoFile(null)
    setExistingLogoUrl(null)
  }

  const openNewModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">טוען...</div>
      </div>
    )
  }

  const columns = [
    { key: 'name', header: 'שם' },
    { key: 'email', header: 'אימייל' },
    { key: 'phone', header: 'טלפון', render: (agent: Agent) => agent.phone || '-' },
    {
      key: '_count',
      header: 'לקוחות',
      render: (agent: Agent) => (
        <span className="text-primary font-bold">{agent._count.clients}</span>
      ),
    },
    {
      key: 'actions',
      header: 'פעולות',
      render: (agent: Agent) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/dashboard?viewAs=${agent.id}`)
            }}
            className="p-2 hover:bg-emerald-500/10 rounded-lg transition-all"
            title="צפה כסוכן"
          >
            <LogIn size={18} className="text-emerald-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              const url = `${window.location.origin}/dashboard`
              navigator.clipboard.writeText(url)
              showSuccess('הקישור הועתק')
            }}
            className="p-2 hover:bg-purple-500/10 rounded-lg transition-all"
            title="העתק קישור"
          >
            <Copy size={18} className="text-purple-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleEdit(agent)
            }}
            className="p-2 hover:bg-primary/10 rounded-lg transition-all"
            title="עריכה"
          >
            <Pencil size={18} className="text-primary" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(agent)
            }}
            className="p-2 hover:bg-error/10 rounded-lg transition-all"
            title="מחיקה"
          >
            <Trash2 size={18} className="text-error" />
          </button>
        </div>
      ),
    },
  ]

  const clientColumns = [
    { key: 'name', header: 'שם' },
    { key: 'email', header: 'אימייל' },
    { key: 'phone', header: 'טלפון', render: (client: Client) => client.phone || '-' },
    { key: 'idNumber', header: 'ת.ז', render: (client: Client) => client.idNumber || '-' },
    {
      key: 'agent',
      header: 'סוכן',
      render: (client: Client) => (
        <span className="text-blue-400 font-medium">{client.agent?.name || '-'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'פעולות',
      render: (client: Client) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/client/folders?viewAs=${client.id}`)
            }}
            className="p-2 hover:bg-blue-500/10 rounded-lg transition-all"
            title="צפה כלקוח"
          >
            <Eye size={18} className="text-blue-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteClient(client)
            }}
            className="p-2 hover:bg-error/10 rounded-lg transition-all"
            title="מחיקה"
          >
            <Trash2 size={18} className="text-error" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <AppLayout showHeader={false} showFooter={false}>
      <div className="min-h-screen overflow-x-hidden relative bg-[#0a1a0f]">
        {/* Admin Green Glow Effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-emerald-500/50 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-green-500/45 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-teal-500/35 rounded-full blur-[150px]" />
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-green-400/40 rounded-full blur-[80px]" />
          <div className="absolute bottom-1/4 left-1/4 w-[450px] h-[450px] bg-emerald-400/35 rounded-full blur-[90px]" />
        </div>

        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a1a0f]/90 backdrop-blur-md border-b border-emerald-500/20">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/dashboard')}>
                <div className="w-12 h-12">
                  <img
                    src="/uploads/logo-finance.png"
                    alt="מגן פיננסי"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-emerald-400">ניהול משתמשים</h1>
                  <p className="text-xs text-foreground-muted">פאנל מנהל</p>
                </div>
              </div>

              {/* Right Side Controls */}
              <div className="flex items-center gap-3">
                {/* Add Agent Button - Desktop (only show on agents tab) */}
                {activeTab === 'agents' && (
                  <Button variant="accent" onClick={openNewModal} className="hidden sm:flex">
                    <Plus size={20} className="ml-2" />
                    הוסף סוכן
                  </Button>
                )}

                {/* Add Agent Button - Mobile (only show on agents tab) */}
                {activeTab === 'agents' && (
                  <button
                    onClick={openNewModal}
                    className="sm:hidden p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
                  >
                    <Plus size={20} className="text-emerald-400" />
                  </button>
                )}

                {/* Orphaned Clients Button */}
                {orphanedClientsCount > 0 && (
                  <button
                    onClick={() => router.push('/admin/orphaned-clients')}
                    className="relative p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 transition-all"
                    title="לקוחות ממתינים לשיוך"
                  >
                    <AlertTriangle size={20} className="text-amber-400" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-xs text-black font-bold">
                      {orphanedClientsCount}
                    </span>
                  </button>
                )}

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
                      <div className="absolute left-0 top-full mt-2 w-80 bg-[#0d1117] border-2 border-emerald-500/20 rounded-2xl p-4 z-50 shadow-[0_8px_40px_rgba(0,0,0,0.8)]">
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
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold">
                      {session?.user?.name?.charAt(0)}
                    </div>
                    <Menu size={20} className="text-foreground-muted" />
                  </button>

                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                      <div className="absolute left-0 top-full mt-2 w-72 bg-[#0d1117] border-2 border-emerald-500/20 rounded-2xl p-4 z-50 shadow-[0_8px_40px_rgba(0,0,0,0.8)]">
                        {/* User Info */}
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 mb-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-lg">
                            {session?.user?.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold">{session?.user?.name}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-white">
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
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all text-right"
                        >
                          <div className="p-2 rounded-lg bg-emerald-500/20">
                            <Home size={18} className="text-emerald-400" />
                          </div>
                          <span>דשבורד</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowMenu(false)
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 transition-all text-right"
                        >
                          <div className="p-2 rounded-lg bg-emerald-500/20">
                            <Users size={18} className="text-emerald-400" />
                          </div>
                          <span>ניהול סוכנים</span>
                        </button>

                        <button
                          onClick={() => {
                            router.push('/settings')
                            setShowMenu(false)
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all text-right"
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

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 pt-24 pb-32 md:pb-8 relative z-10">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('agents')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'agents'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/5 text-foreground-muted hover:bg-white/10'
              }`}
            >
              <Users size={18} className="inline ml-2" />
              סוכנים ({agents.length})
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'clients'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-foreground-muted hover:bg-white/10'
              }`}
            >
              <Users size={18} className="inline ml-2" />
              לקוחות ({clients.length})
            </button>
          </div>

          {/* Agents Table */}
          {activeTab === 'agents' && (
            <>
              <div className="mb-4 relative">
                <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
                <input
                  type="text"
                  value={agentSearchQuery}
                  onChange={(e) => setAgentSearchQuery(e.target.value)}
                  placeholder="חיפוש לפי שם, טלפון או אימייל..."
                  className="w-full pr-12 pl-4 py-3 rounded-xl bg-[#0d1117] border border-emerald-500/20 text-white placeholder-foreground-muted focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              <Table
                data={agentSearchQuery.trim()
                  ? agents.filter((agent) => {
                      const q = agentSearchQuery.trim().toLowerCase()
                      return (
                        agent.name.toLowerCase().includes(q) ||
                        agent.email.toLowerCase().includes(q) ||
                        (agent.phone && agent.phone.includes(q))
                      )
                    })
                  : agents
                }
                columns={columns}
                emptyMessage={agentSearchQuery.trim() ? 'לא נמצאו תוצאות' : 'אין סוכנים במערכת'}
              />
            </>
          )}

          {/* Clients Table */}
          {activeTab === 'clients' && (
            <Table
              data={clients}
              columns={clientColumns}
              emptyMessage="אין לקוחות במערכת"
            />
          )}
        </main>

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => !submitting && setIsModalOpen(false)}
          title={editingAgent ? 'עריכת סוכן' : 'הוספת סוכן חדש'}
        >
          {submitting ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
              <p className="text-xl font-medium text-emerald-400">מחברים אותכם...</p>
              <p className="text-sm text-foreground-muted mt-2">אנא המתן</p>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground-muted flex items-center gap-2">
                <Image size={16} />
                לוגו (אופציונלי)
              </label>

              {logoPreview || existingLogoUrl ? (
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
                    <img
                      src={logoPreview || withFreshCacheBust(existingLogoUrl)}
                      alt="לוגו"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground-muted mb-2">
                      {logoPreview ? 'הלוגו הועלה בהצלחה' : 'לוגו קיים'}
                    </p>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={14} />
                      הסר לוגו
                    </button>
                  </div>
                </div>
              ) : (
                <ImageCropper
                  ref={imageCropperRef}
                  onImageCropped={handleImageCropped}
                  aspectRatio={1}
                  circularCrop={true}
                  maxWidth={400}
                  maxHeight={400}
                />
              )}
            </div>

            <Input
              label="שם מלא"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoComplete="off"
            />
            <Input
              label="אימייל"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              dir="ltr"
              autoComplete="off"
            />
            <Input
              label={editingAgent ? 'סיסמה חדשה (השאר ריק לשמירה)' : 'סיסמה'}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingAgent}
              dir="ltr"
              autoComplete="new-password"
            />
            <Input
              label="טלפון"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              dir="ltr"
              autoComplete="off"
            />
            <Input
              label="תעודת זהות"
              value={formData.idNumber}
              onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
              dir="ltr"
              autoComplete="off"
            />

            <div className="flex gap-4 pt-4">
              <Button type="submit" variant="accent" className="flex-1">
                {editingAgent ? 'עדכן' : 'הוסף'}
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
          )}
        </Modal>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </AppLayout>
  )
}
