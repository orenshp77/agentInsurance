'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Lock, Phone, ArrowLeft, ArrowRight, Sparkles, CheckCircle, Briefcase, Image, Trash2 } from 'lucide-react'
import { showSuccess, showError } from '@/lib/swal'
import ImageCropper from '@/components/ui/ImageCropper'

export default function AgentRegistrationPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  })

  const handleImageCropped = (croppedImageUrl: string, file: File) => {
    setLogoPreview(croppedImageUrl)
    setLogoFile(file)
  }

  const handleRemoveLogo = () => {
    setLogoPreview(null)
    setLogoFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      showError('הסיסמאות אינן תואמות')
      return
    }

    if (formData.password.length < 6) {
      showError('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }

    setSubmitting(true)

    try {
      // First, upload the logo if exists
      let logoUrl = null
      if (logoFile) {
        const logoFormData = new FormData()
        logoFormData.append('file', logoFile)
        logoFormData.append('type', 'logo')

        const uploadRes = await fetch('/api/upload-logo', {
          method: 'POST',
          body: logoFormData,
        })

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          logoUrl = uploadData.url
        }
      }

      // Then register the agent
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          role: 'AGENT',
          logoUrl,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'שגיאה בהרשמה')
      }

      setSuccess(true)
      showSuccess('ההרשמה הושלמה בהצלחה!')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'שגיאה בהרשמה')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f] p-4">
        <div className="bg-[#0d1117] border-2 border-[#30363d] rounded-3xl p-12 text-center max-w-md animate-fade-in-up">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
            <CheckCircle size={48} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">ההרשמה הושלמה!</h2>
          <p className="text-foreground-muted mb-6">
            החשבון שלך נוצר בהצלחה כסוכן ביטוח. כעת תוכל להתחבר למערכת ולנהל את הלקוחות שלך.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
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
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative max-w-lg mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/login')}
          className="flex items-center gap-2 text-foreground-muted hover:text-white transition-colors mb-6"
        >
          <ArrowRight size={20} />
          <span>חזרה להתחברות</span>
        </button>

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
            <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
              הרשמה כסוכן ביטוח
            </span>
          </h1>
          <p className="text-foreground-muted flex items-center justify-center gap-2">
            <Sparkles size={16} className="text-green-500" />
            מגן פיננסי - ניהול תיק חכם
            <Sparkles size={16} className="text-green-500" />
          </p>
        </div>

        {/* Agent Badge */}
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-2xl p-4 mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Briefcase size={24} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-green-400">חשבון סוכן</p>
              <p className="font-bold text-white">הצטרף כסוכן ביטוח למערכת</p>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-[#0d1117] border-2 border-[#30363d] rounded-3xl p-6 md:p-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground-muted flex items-center gap-2">
                <Image size={16} />
                לוגו (אופציונלי)
              </label>

              {logoPreview ? (
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                    <img
                      src={logoPreview}
                      alt="לוגו"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground-muted mb-2">הלוגו הועלה בהצלחה</p>
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
                  onImageCropped={handleImageCropped}
                  aspectRatio={1}
                  circularCrop={true}
                  maxWidth={400}
                  maxHeight={400}
                />
              )}
            </div>

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
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-green-500 transition-all"
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
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-green-500 transition-all"
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
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-green-500 transition-all"
                  placeholder="050-1234567"
                  required
                  dir="ltr"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Phone size={18} className="text-foreground-muted" />
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
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-green-500 transition-all"
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
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-green-500 transition-all"
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
              className="w-full py-4 text-lg rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>הירשם כסוכן</span>
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
                className="text-green-500 hover:text-green-400 transition-colors"
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
