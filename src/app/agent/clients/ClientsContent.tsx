'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Pencil, Trash2, ArrowRight, MessageCircle, Eye, UserPlus, Copy, Check, FolderOpen, Search } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import { AppLayout } from '@/components/layout'
import { showSuccess, showError, showConfirm } from '@/lib/swal'

interface Client {
  id: string
  email: string
  name: string
  phone: string | null
  idNumber: string | null
  createdAt: string
  _count: {
    folders: number
  }
}

interface ViewAsUser {
  id: string
  name: string
  email: string
  role: string
}

export default function ClientsContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const agentId = searchParams.get('agentId')
  const viewAsId = searchParams.get('viewAs')
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    idNumber: '',
  })
  const [showRegisterLink, setShowRegisterLink] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null)
  const [newClientPhone, setNewClientPhone] = useState('')
  const [agentName, setAgentName] = useState<string>('')
  const [viewAsUser, setViewAsUser] = useState<ViewAsUser | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Determine if admin is viewing as agent
  const isViewingAs = !!viewAsId && session?.user?.role === 'ADMIN'

  // Fetch viewAs user info
  useEffect(() => {
    if (viewAsId && session?.user?.role === 'ADMIN') {
      fetch(`/api/users/${viewAsId}?_t=${Date.now()}`)
        .then(res => res.json())
        .then(data => setViewAsUser(data))
        .catch(console.error)
    }
  }, [viewAsId, session])

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
      if (agentId && session.user.role === 'ADMIN') {
        fetchAgentName()
      }
    }
  }, [session, agentId, viewAsId])

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    if (!session?.user) return

    const interval = setInterval(() => {
      fetchClients()
    }, 30000)

    return () => clearInterval(interval)
  }, [session, agentId, viewAsId])

  const fetchAgentName = async () => {
    try {
      const res = await fetch(`/api/users/${agentId}?_t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        setAgentName(data.name)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const fetchClients = async () => {
    try {
      // Use viewAsId (admin viewing as agent) or agentId parameter
      const targetAgentId = viewAsId || agentId
      const baseUrl = targetAgentId
        ? `/api/users?role=CLIENT&agentId=${targetAgentId}`
        : '/api/users?role=CLIENT'
      // Add timestamp to prevent browser caching
      const url = `${baseUrl}&_t=${Date.now()}`
      const res = await fetch(url, { cache: 'no-store' })

      if (!res.ok) {
        console.error('Failed to fetch clients:', res.status)
        setClients([])
        return
      }

      const data = await res.json()
      // Handle both old array format and new paginated format
      if (Array.isArray(data)) {
        setClients(data)
      } else if (data.users) {
        setClients(data.users)
      } else {
        console.error('Expected array but got:', data)
        setClients([])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const url = editingClient ? `/api/users/${editingClient.id}` : '/api/users'
      const method = editingClient ? 'PUT' : 'POST'

      // When admin is viewing as agent, pass the agent's ID to associate the client
      const bodyData: Record<string, unknown> = {
        ...formData,
        role: 'CLIENT',
      }
      // If admin is viewing as agent, include the agentId so client is associated with that agent
      if (viewAsId && session?.user?.role === 'ADMIN') {
        bodyData.agentId = viewAsId
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'שגיאה')
      }

      showSuccess(editingClient ? 'הלקוח עודכן בהצלחה' : 'הלקוח נוסף בהצלחה')
      setIsModalOpen(false)
      resetForm()
      fetchClients()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'שגיאה בשמירת הלקוח')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (client: Client) => {
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

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      email: client.email,
      password: '',
      name: client.name,
      phone: client.phone || '',
      idNumber: client.idNumber || '',
    })
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setEditingClient(null)
    setFormData({ email: '', password: '', name: '', phone: '', idNumber: '' })
  }

  const openNewModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const sendWhatsApp = (client: Client) => {
    if (!client.phone) {
      showError('אין מספר טלפון ללקוח')
      return
    }
    const phone = client.phone.replace(/\D/g, '')
    const message = encodeURIComponent(
      `שלום ${client.name}, הנך מוזמן להירשם למערכת ניהול התיקים שלנו.`
    )
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
  }

  const getRegistrationLink = () => {
    if (typeof window === 'undefined') return ''
    const effectiveAgentId = viewAsId || agentId || session?.user?.id
    return `${window.location.origin}/register/${effectiveAgentId}`
  }

  const copyRegistrationLink = async () => {
    const link = getRegistrationLink()
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      showSuccess('הקישור הועתק!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showError('שגיאה בהעתקת הקישור')
    }
  }

  const shareRegistrationViaWhatsApp = (phoneNumber?: string) => {
    const link = getRegistrationLink()
    const message = encodeURIComponent(
      `שלום! הנך מוזמן להירשם למערכת ניהול התיקים שלנו.\n\nלהרשמה לחץ כאן:\n${link}`
    )
    const phone = phoneNumber ? phoneNumber.replace(/\D/g, '') : ''
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
  }

  const sendToNewClient = () => {
    if (!newClientPhone) {
      showError('יש להזין מספר טלפון')
      return
    }
    shareRegistrationViaWhatsApp(newClientPhone)
    setNewClientPhone('')
    setShowRegisterLink(false)
  }

  const getClientLoginLink = (client: Client) => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/login?email=${encodeURIComponent(client.email)}`
  }

  const copyClientLoginLink = async (client: Client) => {
    const link = getClientLoginLink(client)
    try {
      await navigator.clipboard.writeText(link)
      setCopiedClientId(client.id)
      showSuccess(`קישור הכניסה של ${client.name} הועתק!`)
      setTimeout(() => setCopiedClientId(null), 2000)
    } catch {
      showError('שגיאה בהעתקת הקישור')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">טוען...</div>
      </div>
    )
  }

  const filteredClients = searchQuery.trim()
    ? clients.filter((client) => {
        const q = searchQuery.trim().toLowerCase()
        return (
          client.name.toLowerCase().includes(q) ||
          (client.phone && client.phone.includes(q)) ||
          (client.idNumber && client.idNumber.includes(q))
        )
      })
    : clients

  const columns = [
    { key: 'name', header: 'שם' },
    { key: 'email', header: 'אימייל' },
    { key: 'phone', header: 'טלפון', render: (client: Client) => client.phone || '-' },
    { key: 'idNumber', header: 'ת.ז', render: (client: Client) => client.idNumber || '-' },
    {
      key: '_count',
      header: 'תיקיות',
      render: (client: Client) => (
        <span className="text-primary font-bold">{client._count.folders}</span>
      ),
    },
    {
      key: 'actions',
      header: 'פעולות',
      render: (client: Client) => (
        <div className="flex flex-col gap-2">
          {/* Main action button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              const url = viewAsId
                ? `/agent/clients/${client.id}/folders?viewAs=${viewAsId}`
                : `/agent/clients/${client.id}/folders`
              router.push(url)
            }}
            className="h-8 px-3 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap w-full"
          >
            <FolderOpen size={14} />
            צפייה במסמכים שלו
          </button>
          {/* Icon buttons grid */}
          <div className="grid grid-cols-5 gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                copyClientLoginLink(client)
              }}
              className="w-7 h-7 flex items-center justify-center hover:bg-blue-500/10 rounded-md transition-all"
              title="העתק קישור כניסה"
            >
              {copiedClientId === client.id ? (
                <Check size={14} className="text-green-400" />
              ) : (
                <Copy size={14} className="text-purple-400" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/client/folders?viewAs=${client.id}`)
              }}
              className="w-7 h-7 flex items-center justify-center hover:bg-accent/10 rounded-md transition-all"
              title="צפה כלקוח"
            >
              <Eye size={14} className="text-accent" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                sendWhatsApp(client)
              }}
              className="w-7 h-7 flex items-center justify-center hover:bg-green-500/10 rounded-md transition-all"
              title="שלח וואטסאפ"
            >
              <MessageCircle size={14} className="text-green-500" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleEdit(client)
              }}
              className="w-7 h-7 flex items-center justify-center hover:bg-primary/10 rounded-md transition-all"
              title="עריכה"
            >
              <Pencil size={14} className="text-primary" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(client)
              }}
              className="w-7 h-7 flex items-center justify-center hover:bg-error/10 rounded-md transition-all"
              title="מחיקה"
            >
              <Trash2 size={14} className="text-error" />
            </button>
          </div>
        </div>
      ),
    },
  ]

  // Handle back navigation - go to agent dashboard
  const handleGoBack = () => {
    // Priority: viewAs > agentId > current agent's dashboard
    const targetAgentId = viewAsId || agentId
    if (targetAgentId) {
      router.push(`/dashboard?agentId=${targetAgentId}`)
    } else {
      // Go to agent's own dashboard
      router.push('/dashboard')
    }
  }

  return (
    <AppLayout showHeader={false} showFooter={false}>
      <div className="min-h-screen relative">
        {/* Admin Viewing As Banner */}
        {isViewingAs && viewAsUser && (
          <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-amber-500 to-orange-500 py-1 md:py-2 px-3 md:px-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 md:gap-4 text-black font-medium text-xs md:text-base min-w-0">
                <Eye size={14} className="shrink-0 md:w-[18px] md:h-[18px]" />
                <span className="truncate">צופים: {viewAsUser.name}</span>
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

        {/* Header */}
        <header className={`fixed left-0 right-0 z-50 bg-background-card border-b border-primary/20 ${isViewingAs ? 'top-10' : 'top-0'}`}>
          <div className="max-w-7xl mx-auto px-3 md:px-4 py-3 md:py-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <button
                onClick={handleGoBack}
                className="p-2 hover:bg-primary/10 rounded-xl transition-all shrink-0"
              >
                <ArrowRight size={20} className="md:w-6 md:h-6" />
              </button>
              <h1 className="text-lg md:text-2xl font-bold text-primary truncate">
                {`ניהול לקוחות של הסוכן: ${agentName || viewAsUser?.name || session?.user?.name || ''}`}
              </h1>
            </div>

            <div className="flex gap-2 shrink-0">
              <div className="relative">
                <button
                  onClick={() => setShowRegisterLink(!showRegisterLink)}
                  className="h-10 px-3 md:px-5 flex items-center justify-center gap-1.5 md:gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs md:text-sm font-medium hover:from-green-400 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/30"
                >
                  <UserPlus size={18} className="shrink-0" />
                  <span className="hidden sm:inline">שלח קישור הרשמה ללקוח</span>
                  <span className="sm:hidden">קישור</span>
                </button>

                {/* Registration Link Popup */}
                {showRegisterLink && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowRegisterLink(false)}
                    />
                    <div className="absolute left-0 top-full mt-2 w-96 bg-[#0d1117] border-2 border-green-500/30 rounded-2xl p-5 z-50 shadow-[0_8px_40px_rgba(0,0,0,0.8)] animate-scale-in">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                          <UserPlus size={24} className="text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">שלח קישור הרשמה</h3>
                          <p className="text-xs text-foreground-muted">הלקוח יירשם לבד דרך הקישור</p>
                        </div>
                      </div>

                      {/* Send to specific phone */}
                      <div className="mb-5">
                        <label className="block text-sm font-medium mb-2 text-foreground-muted">
                          שלח ישירות ללקוח חדש
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            value={newClientPhone}
                            onChange={(e) => setNewClientPhone(e.target.value)}
                            placeholder="הזן מספר טלפון..."
                            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-green-500 transition-all"
                            dir="ltr"
                          />
                          <button
                            onClick={sendToNewClient}
                            className="px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:from-green-400 hover:to-emerald-500 transition-all flex items-center gap-2"
                          >
                            <MessageCircle size={18} />
                            שלח
                          </button>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-xs text-foreground-muted">או</span>
                        <div className="flex-1 h-px bg-white/10" />
                      </div>

                      {/* Link Preview */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2 text-foreground-muted">
                          העתק את הקישור
                        </label>
                        <div className="bg-white/5 rounded-xl p-3 break-all border border-white/10">
                          <code className="text-xs text-green-400">
                            {getRegistrationLink()}
                          </code>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={copyRegistrationLink}
                          className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-sm"
                        >
                          {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                          {copied ? 'הועתק!' : 'העתק קישור'}
                        </button>
                        <button
                          onClick={() => shareRegistrationViaWhatsApp()}
                          className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-green-500/20 hover:bg-green-500/30 transition-all text-sm text-green-400"
                        >
                          <MessageCircle size={18} />
                          שתף בוואטסאפ
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={openNewModal}
                className="h-10 px-3 md:px-5 flex items-center justify-center gap-1.5 md:gap-2 rounded-xl bg-accent hover:bg-accent/80 text-white text-xs md:text-sm font-medium transition-all"
              >
                <Plus size={18} className="shrink-0" />
                <span className="hidden sm:inline">הוסף לקוח</span>
                <span className="sm:hidden">הוסף</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className={`max-w-7xl mx-auto px-4 py-8 ${isViewingAs ? 'pt-40' : 'pt-28'}`}>
          {/* Search */}
          <div className="mb-4 relative">
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש לפי שם, טלפון או ת.ז..."
              className="w-full pr-12 pl-4 py-3 rounded-xl bg-background-card border border-primary/20 text-white placeholder-foreground-muted focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <Table
            data={filteredClients}
            columns={columns}
            emptyMessage={searchQuery.trim() ? 'לא נמצאו תוצאות' : 'אין לקוחות במערכת'}
          />
        </main>

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => !submitting && setIsModalOpen(false)}
          title={editingClient ? 'עריכת לקוח' : 'הוספת לקוח חדש'}
        >
          {submitting ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 border-4 border-accent/30 border-t-accent rounded-full animate-spin mb-6"></div>
              <p className="text-xl font-medium text-accent">מחברים אותכם...</p>
              <p className="text-sm text-foreground-muted mt-2">אנא המתן</p>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="שם מלא"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="אימייל"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              dir="ltr"
            />
            <Input
              label={editingClient ? 'סיסמה חדשה (השאר ריק לשמירה)' : 'סיסמה'}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingClient}
              dir="ltr"
            />
            <Input
              label="טלפון"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              dir="ltr"
            />
            <Input
              label="תעודת זהות"
              value={formData.idNumber}
              onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
              dir="ltr"
            />

            <div className="flex gap-4 pt-4">
              <Button type="submit" variant="accent" className="flex-1">
                {editingClient ? 'עדכן' : 'הוסף'}
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
    </AppLayout>
  )
}
