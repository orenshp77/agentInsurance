'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ArrowRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import { AppLayout } from '@/components/layout'
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
              handleEdit(agent)
            }}
            className="p-2 hover:bg-primary/10 rounded-lg transition-all"
          >
            <Pencil size={18} className="text-primary" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(agent)
            }}
            className="p-2 hover:bg-error/10 rounded-lg transition-all"
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
              <h1 className="text-2xl font-bold text-primary">ניהול סוכנים</h1>
            </div>

            <Button variant="accent" onClick={openNewModal}>
              <Plus size={20} className="ml-2" />
              הוסף סוכן
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
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
    </AppLayout>
  )
}
