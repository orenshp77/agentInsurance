'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, Users, Trash2, UserPlus, CheckSquare, Square,
  AlertTriangle, FolderOpen, FileText, Menu, Bell, LogOut, Home, Settings
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { AppLayout } from '@/components/layout'
import MobileNav from '@/components/layout/MobileNav'
import { showSuccess, showError, showConfirm } from '@/lib/swal'

interface OrphanedClient {
  id: string
  name: string
  email: string
  phone?: string
  idNumber?: string
  formerAgentName: string
  createdAt: string
  folders: {
    id: string
    _count: { files: number }
  }[]
}

interface Agent {
  id: string
  name: string
  email: string
}

export default function OrphanedClientsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [clients, setClients] = useState<OrphanedClient[]>([])
  const [groupedClients, setGroupedClients] = useState<Record<string, OrphanedClient[]>>({})
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchOrphanedClients()
      fetchAgents()
    }
  }, [session])

  const fetchOrphanedClients = async () => {
    try {
      const res = await fetch('/api/orphaned-clients')
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients)
        setGroupedClients(data.groupedByAgent)
      }
    } catch (error) {
      console.error('Error fetching orphaned clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setAgents(data.filter((u: Agent & { role: string }) => u.role === 'AGENT'))
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const toggleClientSelection = (clientId: string) => {
    const newSelection = new Set(selectedClients)
    if (newSelection.has(clientId)) {
      newSelection.delete(clientId)
    } else {
      newSelection.add(clientId)
    }
    setSelectedClients(newSelection)
  }

  const selectAllFromAgent = (agentName: string) => {
    const agentClients = groupedClients[agentName] || []
    const newSelection = new Set(selectedClients)
    const allSelected = agentClients.every(c => selectedClients.has(c.id))

    if (allSelected) {
      agentClients.forEach(c => newSelection.delete(c.id))
    } else {
      agentClients.forEach(c => newSelection.add(c.id))
    }
    setSelectedClients(newSelection)
  }

  const handleAssignClients = async () => {
    if (!selectedAgentId || selectedClients.size === 0) {
      showError('יש לבחור סוכן ולקוחות')
      return
    }

    try {
      const res = await fetch('/api/orphaned-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientIds: Array.from(selectedClients),
          newAgentId: selectedAgentId,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        showSuccess(`${data.assignedCount} לקוחות שויכו לסוכן ${data.newAgentName}`)
        setSelectedClients(new Set())
        setShowAssignModal(false)
        setSelectedAgentId('')
        fetchOrphanedClients()
      } else {
        showError('שגיאה בשיוך הלקוחות')
      }
    } catch (error) {
      console.error('Error assigning clients:', error)
      showError('שגיאה בשיוך הלקוחות')
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedClients.size === 0) return

    const confirmed = await showConfirm(
      `האם אתה בטוח שברצונך למחוק ${selectedClients.size} לקוחות?`,
      'פעולה זו אינה ניתנת לביטול!'
    )

    if (!confirmed) return

    try {
      const res = await fetch(`/api/orphaned-clients?clientIds=${Array.from(selectedClients).join(',')}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        const data = await res.json()
        showSuccess(`${data.deletedCount} לקוחות נמחקו בהצלחה`)
        setSelectedClients(new Set())
        fetchOrphanedClients()
      } else {
        showError('שגיאה במחיקת הלקוחות')
      }
    } catch (error) {
      console.error('Error deleting clients:', error)
      showError('שגיאה במחיקת הלקוחות')
    }
  }

  const handleDeleteAllFromAgent = async (formerAgentName: string) => {
    const clientCount = groupedClients[formerAgentName]?.length || 0

    const confirmed = await showConfirm(
      `האם אתה בטוח שברצונך למחוק את כל ${clientCount} הלקוחות של הסוכן ${formerAgentName}?`,
      'פעולה זו אינה ניתנת לביטול!'
    )

    if (!confirmed) return

    try {
      const res = await fetch(`/api/orphaned-clients?formerAgentName=${encodeURIComponent(formerAgentName)}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        const data = await res.json()
        showSuccess(`${data.deletedCount} לקוחות נמחקו בהצלחה`)
        fetchOrphanedClients()
      } else {
        showError('שגיאה במחיקת הלקוחות')
      }
    } catch (error) {
      console.error('Error deleting clients:', error)
      showError('שגיאה במחיקת הלקוחות')
    }
  }

  const getTotalFiles = (client: OrphanedClient) => {
    return client.folders.reduce((acc, f) => acc + f._count.files, 0)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1a0f] bg-mesh">
        <div className="text-center animate-fade-in">
          <div className="loading-spinner mx-auto mb-4" />
          <p className="text-foreground-muted">טוען...</p>
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <AppLayout showHeader={false} showFooter={false}>
      <div className="min-h-screen overflow-x-hidden relative bg-mesh bg-grid bg-[#0a1a0f]">
        {/* Admin Green Glow Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-amber-500/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-orange-500/25 rounded-full blur-[100px]" />
        </div>

        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a1a0f]/90 backdrop-blur-md border-b border-amber-500/20">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push('/admin/agents')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-amber-500/10 text-amber-400 transition-all"
              >
                <ArrowRight size={20} />
                <span>חזרה לניהול סוכנים</span>
              </button>

              <h1 className="text-xl font-bold text-amber-400">
                לקוחות ממתינים לשיוך
              </h1>

              {/* Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold">
                    {session.user.name?.charAt(0)}
                  </div>
                  <Menu size={20} className="text-foreground-muted" />
                </button>

                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl p-4 z-50 shadow-[0_8px_40px_rgba(0,0,0,0.8)] bg-[#0d1117] border-2 border-emerald-500/20">
                      <button
                        onClick={() => {
                          router.push('/dashboard')
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-500/10 transition-all text-right"
                      >
                        <div className="p-2 rounded-lg bg-emerald-500/20">
                          <Home size={18} className="text-emerald-400" />
                        </div>
                        <span>דשבורד</span>
                      </button>

                      <button
                        onClick={() => {
                          router.push('/admin/agents')
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-500/10 transition-all text-right"
                      >
                        <div className="p-2 rounded-lg bg-emerald-500/20">
                          <Users size={18} className="text-emerald-400" />
                        </div>
                        <span>ניהול סוכנים</span>
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
        </header>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 pt-24 pb-32 relative z-10">
          {/* Info Banner */}
          <div className="mb-6 glass-card rounded-2xl p-4 border-amber-500/30 bg-amber-500/10">
            <div className="flex items-start gap-3">
              <AlertTriangle size={24} className="text-amber-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-amber-400 mb-1">לקוחות ממתינים לשיוך</h3>
                <p className="text-foreground-muted text-sm">
                  לקוחות אלה היו שייכים לסוכנים שנמחקו. ניתן לשייך אותם לסוכן אחר או למחוק אותם.
                </p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          {selectedClients.size > 0 && (
            <div className="mb-6 glass-card rounded-2xl p-4 border-emerald-500/30 flex items-center justify-between animate-fade-in-up">
              <span className="text-foreground-muted">
                נבחרו <span className="text-emerald-400 font-bold">{selectedClients.size}</span> לקוחות
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-all"
                >
                  <UserPlus size={18} />
                  שייך לסוכן
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all"
                >
                  <Trash2 size={18} />
                  מחק נבחרים
                </button>
              </div>
            </div>
          )}

          {/* Clients Table by Agent */}
          {Object.keys(groupedClients).length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Users size={48} className="mx-auto text-foreground-subtle mb-4" />
              <h3 className="text-xl font-bold mb-2">אין לקוחות ממתינים</h3>
              <p className="text-foreground-muted">כל הלקוחות משויכים לסוכנים</p>
            </div>
          ) : (
            Object.entries(groupedClients).map(([agentName, agentClients]) => (
              <div key={agentName} className="mb-8 animate-fade-in-up">
                {/* Agent Group Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/20">
                      <Users size={20} className="text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-amber-400">
                        לקוחות של הסוכן: {agentName}
                      </h2>
                      <p className="text-sm text-foreground-muted">
                        {agentClients.length} לקוחות
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => selectAllFromAgent(agentName)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-all"
                    >
                      {agentClients.every(c => selectedClients.has(c.id)) ? (
                        <CheckSquare size={16} className="text-emerald-400" />
                      ) : (
                        <Square size={16} className="text-foreground-muted" />
                      )}
                      בחר הכל
                    </button>
                    <button
                      onClick={() => handleDeleteAllFromAgent(agentName)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-all"
                    >
                      <Trash2 size={16} />
                      מחק הכל
                    </button>
                  </div>
                </div>

                {/* Clients Table */}
                <div className="glass-card rounded-2xl overflow-hidden border-amber-500/20">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="p-4 text-right text-sm text-foreground-muted">בחר</th>
                        <th className="p-4 text-right text-sm text-foreground-muted">שם</th>
                        <th className="p-4 text-right text-sm text-foreground-muted">אימייל</th>
                        <th className="p-4 text-right text-sm text-foreground-muted">טלפון</th>
                        <th className="p-4 text-right text-sm text-foreground-muted">תיקיות</th>
                        <th className="p-4 text-right text-sm text-foreground-muted">קבצים</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentClients.map((client) => (
                        <tr
                          key={client.id}
                          className={`border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer ${
                            selectedClients.has(client.id) ? 'bg-emerald-500/10' : ''
                          }`}
                          onClick={() => toggleClientSelection(client.id)}
                        >
                          <td className="p-4">
                            {selectedClients.has(client.id) ? (
                              <CheckSquare size={20} className="text-emerald-400" />
                            ) : (
                              <Square size={20} className="text-foreground-muted" />
                            )}
                          </td>
                          <td className="p-4 font-medium">{client.name}</td>
                          <td className="p-4 text-foreground-muted">{client.email}</td>
                          <td className="p-4 text-foreground-muted">{client.phone || '-'}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <FolderOpen size={16} className="text-amber-400" />
                              <span>{client.folders.length}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <FileText size={16} className="text-blue-400" />
                              <span>{getTotalFiles(client)}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Assign Modal */}
        {showAssignModal && (
          <>
            <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowAssignModal(false)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
              <div className="glass-card rounded-2xl p-6 border-emerald-500/30">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <UserPlus size={24} className="text-emerald-400" />
                  שיוך לקוחות לסוכן
                </h2>

                <p className="text-foreground-muted mb-4">
                  בחר סוכן לשיוך {selectedClients.size} לקוחות
                </p>

                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-emerald-500/20 focus:border-emerald-500/50 focus:outline-none mb-6"
                >
                  <option value="">בחר סוכן...</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.email})
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAssignClients}
                    disabled={!selectedAgentId}
                    className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-all disabled:opacity-50"
                  >
                    שייך לקוחות
                  </button>
                  <button
                    onClick={() => {
                      setShowAssignModal(false)
                      setSelectedAgentId('')
                    }}
                    className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </AppLayout>
  )
}
