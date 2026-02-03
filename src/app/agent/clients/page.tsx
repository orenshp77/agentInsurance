'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Pencil, Trash2, ArrowRight, MessageCircle, Eye, UserPlus, Link2, Copy, Check } from 'lucide-react'
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

export default function AgentClientsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const agentId = searchParams.get('agentId')
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
  const [newClientPhone, setNewClientPhone] = useState('')
  const [agentName, setAgentName] = useState<string>('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'AGENT' && session?.user?.role !== 'ADMIN') {
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
  }, [session, agentId])

  const fetchAgentName = async () => {
    try {
      const res = await fetch(`/api/users/${agentId}`)
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
      const url = agentId
        ? `/api/users?role=CLIENT&agentId=${agentId}`
        : '/api/users?role=CLIENT'
      const res = await fetch(url)
      const data = await res.json()
      setClients(data)
    } catch (error) {
      showError('שגיאה בטעינת הלקוחות')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingClient ? `/api/users/${editingClient.id}` : '/api/users'
      const method = editingClient ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          role: 'CLIENT',
        }),
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
    return `${window.location.origin}/register/${session?.user?.id}`
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
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/client/folders?viewAs=${client.id}`)
            }}
            className="p-2 hover:bg-accent/10 rounded-lg transition-all"
            title="צפה כלקוח"
          >
            <Eye size={18} className="text-accent" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              sendWhatsApp(client)
            }}
            className="p-2 hover:bg-green-500/10 rounded-lg transition-all"
            title="שלח וואטסאפ"
          >
            <MessageCircle size={18} className="text-green-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleEdit(client)
            }}
            className="p-2 hover:bg-primary/10 rounded-lg transition-all"
            title="עריכה"
          >
            <Pencil size={18} className="text-primary" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(client)
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
      <div className="min-h-screen">
        {/* Header */}
        <header className="bg-background-card border-b border-primary/20">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-primary/10 rounded-xl transition-all"
              >
                <ArrowRight size={24} />
              </button>
              <h1 className="text-2xl font-bold text-primary">
                {agentId && agentName ? `לקוחות של ${agentName}` : 'ניהול לקוחות'}
              </h1>
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowRegisterLink(!showRegisterLink)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:from-green-400 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/30"
                >
                  <UserPlus size={20} />
                  <span>שלח קישור הרשמה ללקוח</span>
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

              <Button variant="accent" onClick={openNewModal}>
                <Plus size={20} className="ml-2" />
                הוסף לקוח
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Table
            data={clients}
            columns={columns}
            emptyMessage="אין לקוחות במערכת"
          />
        </main>

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingClient ? 'עריכת לקוח' : 'הוספת לקוח חדש'}
        >
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
        </Modal>
      </div>
    </AppLayout>
  )
}
