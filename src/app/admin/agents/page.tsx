'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ArrowRight, Menu, Bell, LogOut, Home, Users, Settings, LogIn } from 'lucide-react'
import { signOut } from 'next-auth/react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import { AppLayout } from '@/components/layout'
import MobileNav from '@/components/layout/MobileNav'
import { showSuccess, showError, showConfirm } from '@/lib/swal'

interface Agent {
  id: string
  email: string
  name: string
  phone: string | null
  role: string
  createdAt: string
  _count: {
    clients: number
  }
}

export default function AdminAgentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
  })
  const [showMenu, setShowMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/users?role=AGENT')
      const data = await res.json()
      setAgents(data)
    } catch (error) {
      showError('שגיאה בטעינת הסוכנים')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingAgent ? `/api/users/${editingAgent.id}` : '/api/users'
      const method = editingAgent ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          role: 'AGENT',
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
    }
  }

  const handleDelete = async (agent: Agent) => {
    const confirmed = await showConfirm(
      'מחיקת סוכן',
      `האם אתה בטוח שברצונך למחוק את ${agent.name}?`
    )

    if (!confirmed) return

    try {
      const res = await fetch(`/api/users/${agent.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('שגיאה במחיקה')
      }

      showSuccess('הסוכן נמחק בהצלחה')
      fetchAgents()
    } catch (error) {
      showError('שגיאה במחיקת הסוכן')
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
    })
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setEditingAgent(null)
    setFormData({ email: '', password: '', name: '', phone: '' })
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
              router.push(`/admin/agent-view/${agent.id}`)
            }}
            className="p-2 hover:bg-emerald-500/10 rounded-lg transition-all"
            title="צפה בעמוד הסוכן"
          >
            <LogIn size={18} className="text-emerald-400" />
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
                  <h1 className="text-lg font-bold text-emerald-400">ניהול סוכנים</h1>
                  <p className="text-xs text-foreground-muted">פאנל מנהל</p>
                </div>
              </div>

              {/* Right Side Controls */}
              <div className="flex items-center gap-3">
                {/* Add Agent Button - Desktop */}
                <Button variant="accent" onClick={openNewModal} className="hidden sm:flex">
                  <Plus size={20} className="ml-2" />
                  הוסף סוכן
                </Button>

                {/* Add Agent Button - Mobile */}
                <button
                  onClick={openNewModal}
                  className="sm:hidden p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
                >
                  <Plus size={20} className="text-emerald-400" />
                </button>

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
          <Table
            data={agents}
            columns={columns}
            emptyMessage="אין סוכנים במערכת"
          />
        </main>

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingAgent ? 'עריכת סוכן' : 'הוספת סוכן חדש'}
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
              label={editingAgent ? 'סיסמה חדשה (השאר ריק לשמירה)' : 'סיסמה'}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingAgent}
              dir="ltr"
            />
            <Input
              label="טלפון"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              dir="ltr"
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
        </Modal>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </AppLayout>
  )
}
