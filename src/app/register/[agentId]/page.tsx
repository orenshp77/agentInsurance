'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Lock, Phone, CreditCard, ArrowLeft, Sparkles, CheckCircle, Shield } from 'lucide-react'
import { showSuccess, showError } from '@/lib/swal'
import { createLogger } from '@/lib/logger'

const logger = createLogger('ClientRegistration')

interface Agent {
  id: string
  name: string
  email: string
}

export default function ClientRegistrationPage({
  params,
}: {
  params: Promise<{ agentId: string }>
}) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    idNumber: '',
  })

  useEffect(() => {
    logger.pageView('ClientRegistration', { agentId: resolvedParams.agentId })
    fetchAgent()
  }, [resolvedParams.agentId])

  const fetchAgent = async () => {
    try {
      const res = await fetch(`/api/register/agent/${resolvedParams.agentId}`)
      if (res.ok) {
        const data = await res.json()
        setAgent(data)
        logger.info('AUTH: Agent info loaded for registration', { category: 'AUTH', agentId: resolvedParams.agentId, agentName: data.name })
      } else {
        logger.warn('AUTH: Agent not found for registration link', { category: 'AUTH', agentId: resolvedParams.agentId })
      }
    } catch (error) {
      logger.error('AUTH: Failed to fetch agent for registration', error instanceof Error ? error : undefined, { category: 'AUTH', agentId: resolvedParams.agentId })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      logger.warn('AUTH: Client registration - passwords mismatch', { category: 'AUTH', email: formData.email })
      showError('הסיסמאות אינן תואמות')
      return
    }

    if (formData.password.length < 6) {
      logger.warn('AUTH: Client registration - password too short', { category: 'AUTH', email: formData.email })
      showError('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }

    setSubmitting(true)
    logger.info('AUTH: Client registration attempt', { category: 'AUTH', name: formData.name, email: formData.email, agentId: resolvedParams.agentId })

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          idNumber: formData.idNumber,
          agentId: resolvedParams.agentId,
          role: 'CLIENT',
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'שגיאה בהרשמה')
      }

      logger.info('AUTH: Client registration success', { category: 'AUTH', name: formData.name, email: formData.email, agentId: resolvedParams.agentId })
      setSuccess(true)
      showSuccess('ההרשמה הושלמה בהצלחה!')
    } catch (error) {
      logger.error('AUTH: Client registration failed', error instanceof Error ? error : undefined, { category: 'AUTH', email: formData.email, agentId: resolvedParams.agentId })
      showError(error instanceof Error ? error.message : 'שגיאה בהרשמה')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-foreground-muted animate-pulse">טוען...</p>
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f]">
        <div className="bg-[#0d1117] border-2 border-[#30363d] rounded-3xl p-12 text-center max-w-md mx-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-error/20 flex items-center justify-center">
            <User size={40} className="text-error" />
          </div>
          <h2 className="text-xl font-bold text-error mb-2">הסוכן לא נמצא</h2>
          <p className="text-foreground-muted">קישור ההרשמה אינו תקין</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f] p-4">
        <div className="bg-[#0d1117] border-2 border-[#30363d] rounded-3xl p-12 text-center max-w-md animate-fade-in-up">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-success/20 to-emerald-500/20 flex items-center justify-center">
            <CheckCircle size={48} className="text-success" />
          </div>
          <h2 className="text-2xl font-bold mb-2">ההרשמה הושלמה!</h2>
          <p className="text-foreground-muted mb-6">
            החשבון שלך נוצר בהצלחה. כעת תוכל להתחבר למערכת ולצפות במסמכים שלך.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <span>עבור להתחברות</span>
            <ArrowLeft size={20} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f] py-8 px-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in-up">
          {/* Logo */}
          <div className="w-24 h-24 mx-auto mb-6">
            <img
              src="/uploads/logo-finance.png"
              alt="מגן פיננסי"
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>

          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              הרשמה למערכת
            </span>
          </h1>
          <p className="text-foreground-muted flex items-center justify-center gap-2">
            <Sparkles size={16} className="text-gold" />
            מגן פיננסי - ניהול תיק חכם
            <Sparkles size={16} className="text-gold" />
          </p>
        </div>

        {/* Agent Info */}
        <div className="bg-[#0d1117] border-2 border-[#30363d] rounded-2xl p-4 mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-foreground-muted">הסוכן שלך</p>
              <p className="font-bold">{agent.name}</p>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-[#0d1117] border-2 border-[#30363d] rounded-3xl p-6 md:p-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground-muted">
                שם מלא *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary transition-all"
                  placeholder="ישראל ישראלי"
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <User size={18} className="text-foreground-muted" />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground-muted">
                אימייל *
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary transition-all"
                  placeholder="email@example.com"
                  required
                  dir="ltr"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Mail size={18} className="text-foreground-muted" />
                </div>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground-muted">
                טלפון *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary transition-all"
                  placeholder="050-1234567"
                  required
                  dir="ltr"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Phone size={18} className="text-foreground-muted" />
                </div>
              </div>
            </div>

            {/* ID Number */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground-muted">
                תעודת זהות
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.idNumber}
                  onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary transition-all"
                  placeholder="123456789"
                  dir="ltr"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <CreditCard size={18} className="text-foreground-muted" />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground-muted">
                סיסמה *
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary transition-all"
                  placeholder="לפחות 6 תווים"
                  required
                  dir="ltr"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Lock size={18} className="text-foreground-muted" />
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground-muted">
                אימות סיסמה *
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary transition-all"
                  placeholder="הזן שוב את הסיסמה"
                  required
                  dir="ltr"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Lock size={18} className="text-foreground-muted" />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 text-lg rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>הירשם למערכת</span>
                  <ArrowLeft size={20} />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-foreground-muted text-sm">
              כבר יש לך חשבון?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-primary hover:text-primary-hover transition-colors"
              >
                התחבר כאן
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-foreground-muted/50 text-sm mt-6">
          © 2026 מגן פיננסי. כל הזכויות שמורות.
        </p>
      </div>
    </div>
  )
}
