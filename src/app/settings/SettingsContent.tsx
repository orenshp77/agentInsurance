'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Camera, Save, User, Mail, Phone, IdCard, Building2, Loader2, Sparkles, PartyPopper } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import MobileNav from '@/components/layout/MobileNav'
import Swal from 'sweetalert2'
import { showSuccess, showError } from '@/lib/swal'
import { useLogger } from '@/hooks/useLogger'
import { withFreshCacheBust } from '@/lib/utils'
import ImageCropper, { ImageCropperRef } from '@/components/ui/ImageCropper'

interface UserData {
  id: string
  name: string
  email: string
  phone?: string
  idNumber?: string
  logoUrl?: string
  role: string
  profileCompleted?: boolean
}

export default function SettingsContent() {
  const { data: session, status, update: updateSession } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isWelcome = searchParams.get('welcome') === 'true'
  const viewAsParam = searchParams.get('viewAs')
  const viewAsId = viewAsParam && viewAsParam !== 'null' ? viewAsParam : null
  const imageCropperRef = useRef<ImageCropperRef>(null)
  const logger = useLogger('Settings')

  // Determine if viewing as another user (admin viewing agent's settings)
  const isViewingAsOther = !!viewAsId && session?.user?.role === 'ADMIN'
  const targetUserId = isViewingAsOther ? viewAsId : session?.user?.id

  // Smart back navigation - stays in agent context when viewing as agent
  const handleGoBack = () => {
    if (viewAsId) {
      // If viewing as agent, go back to agent's dashboard
      router.push(`/dashboard?viewAs=${viewAsId}`)
    } else {
      router.back()
    }
  }

  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [welcomeAlertShown, setWelcomeAlertShown] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    idNumber: '',
  })

  // Log page view on mount
  useEffect(() => {
    logger.pageView('Settings', { isWelcome, isViewingAsOther, targetUserId })
  }, [isWelcome, isViewingAsOther, targetUserId])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (targetUserId) {
      fetchUserData()
    }
  }, [session, viewAsId])

  const fetchUserData = async () => {
    try {
      const res = await fetch(`/api/users/${targetUserId}`)
      if (res.ok) {
        const data = await res.json()
        console.log('Fetched user data:', data)
        console.log('idNumber from API:', data.idNumber)
        setUserData(data)
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          idNumber: data.idNumber || '',
        })
      }
    } catch (error) {
      logger.error('API_ERROR: Failed to fetch user data', error instanceof Error ? error : undefined, { category: 'API_ERROR', targetUserId })
    } finally {
      setLoading(false)
    }
  }

  // CLIENT welcome alert - show popup instead of form
  const isClientWelcome = isWelcome && !isViewingAsOther && userData?.role === 'CLIENT'

  useEffect(() => {
    if (!isClientWelcome || !userData || welcomeAlertShown) return
    setWelcomeAlertShown(true)

    const showClientWelcomeAlert = async () => {
      const result = await Swal.fire({
        title: 'ברוכים הבאים',
        html: `
          <div style="text-align: right; direction: rtl;">
            <p style="margin-bottom: 20px; color: #a0aec0; font-size: 15px;">לפני הכניסה, בדקו שהפרטים נכונים</p>
            <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; text-align: right;">
              <div style="margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 14px;">
                <span style="color: #a0aec0; font-size: 13px;">שם מלא</span>
                <div style="font-size: 16px; color: #e8e8e8; margin-top: 4px;">${userData.name || '-'}</div>
              </div>
              <div style="margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 14px;">
                <span style="color: #a0aec0; font-size: 13px;">אימייל</span>
                <div style="font-size: 16px; color: #e8e8e8; margin-top: 4px; direction: ltr; text-align: right;">${userData.email || '-'}</div>
              </div>
              <div style="margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 14px;">
                <span style="color: #a0aec0; font-size: 13px;">טלפון</span>
                <div style="font-size: 16px; color: #e8e8e8; margin-top: 4px; direction: ltr; text-align: right;">${userData.phone || '-'}</div>
              </div>
              <div>
                <span style="color: #a0aec0; font-size: 13px;">תעודת זהות</span>
                <div style="font-size: 16px; color: #e8e8e8; margin-top: 4px; direction: ltr; text-align: right;">${userData.idNumber || '-'}</div>
              </div>
            </div>
          </div>
        `,
        confirmButtonText: 'הכל נכון? נכנסים לכרטיס שלך',
        confirmButtonColor: '#3b82f6',
        showCancelButton: false,
        showCloseButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        background: '#0f3460',
        color: '#e8e8e8',
        footer: '<a href="/settings" style="color: #a0aec0; font-size: 13px; text-decoration: underline;">משהו בפרטים לא נכון? לחץ כאן ושנה</a>',
      })

      if (result.isConfirmed) {
        try {
          await fetch('/api/users/complete-profile', { method: 'POST' })
          await updateSession()
          sessionStorage.setItem('profileCompleted', 'true')
          window.location.replace('/client/folders?justCompleted=true')
        } catch {
          showError('שגיאה, נסה שנית')
        }
      }
    }

    showClientWelcomeAlert()
  }, [isClientWelcome, userData, welcomeAlertShown])

  const handleSave = async () => {
    logger.info('USER_ACTION: Profile save started', { category: 'USER_ACTION', isWelcome, isViewingAsOther, targetUserId })
    setSaving(true)
    try {
      // Save user data
      const res = await fetch(`/api/users/${targetUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errorData = await res.text()
        let errorMessage = 'שגיאה בשמירת הפרטים'
        try {
          const parsed = JSON.parse(errorData)
          if (parsed.error) errorMessage = parsed.error
        } catch {
          // use default error message
        }
        logger.warn('USER_ACTION: Profile save failed', { category: 'USER_ACTION', targetUserId, errorMessage, status: res.status })
        showError(errorMessage)
        setSaving(false)
        return
      }

      // If this is a new user (welcome flow), mark profile as completed
      // Only do this for the logged-in user, not when viewing as another user
      if (!isViewingAsOther && (isWelcome || !session?.user?.profileCompleted)) {
        const completeRes = await fetch('/api/users/complete-profile', {
          method: 'POST',
        })
        if (!completeRes.ok) {
          logger.error('API_ERROR: Failed to complete profile', undefined, { category: 'API_ERROR', targetUserId })
        }
        // Update session to reflect profile completion
        await updateSession()
      }

      logger.info('USER_ACTION: Profile saved successfully', { category: 'USER_ACTION', isWelcome, isViewingAsOther, targetUserId })

      // Redirect to appropriate page after saving
      if (isWelcome && !isViewingAsOther) {
        // Use userData.role since session might not be updated yet
        const userRole = userData?.role || session?.user?.role
        // Mark profile as completed in sessionStorage to prevent redirect loop
        sessionStorage.setItem('profileCompleted', 'true')
        if (userRole === 'CLIENT') {
          // Use replace to prevent back button returning to settings
          window.location.replace('/client/folders?justCompleted=true')
        } else {
          // For agents, redirect to dashboard with justCompleted flag
          window.location.replace('/dashboard?justCompleted=true')
        }
        // Don't set saving to false - we're navigating away
        return
      } else {
        showSuccess(isViewingAsOther ? 'הפרטים נשמרו בהצלחה' : 'הפרטים נשמרו בהצלחה')
        // Go back to previous page after saving
        setSaving(false)
        handleGoBack()
      }
    } catch (error) {
      logger.error('USER_ACTION: Profile save error', error instanceof Error ? error : undefined, { category: 'USER_ACTION', targetUserId })
      showError('שגיאה בשמירת הפרטים')
      setSaving(false)
    }
  }

  const handleImageCropped = (previewUrl: string, file: File) => {
    setLogoPreviewUrl(previewUrl)
    setLogoFile(file)
    // Auto-upload after cropping
    uploadCroppedLogo(file)
  }

  const uploadCroppedLogo = async (file: File) => {
    setUploading(true)
    logger.info('FILE_OP: Logo upload started', { category: 'FILE_OP', fileSize: file.size, fileType: file.type })
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('type', 'logo')
      // If admin is viewing as another user, pass the target user ID
      if (isViewingAsOther && targetUserId) {
        uploadFormData.append('userId', targetUserId)
      }

      const res = await fetch('/api/upload-logo', {
        method: 'POST',
        body: uploadFormData,
      })

      if (res.ok) {
        // Update session so logoUrl is reflected in JWT token immediately
        await updateSession()
        // Refetch user data to get the signed URL (don't set logoUrl from upload response - it's just a filename)
        await fetchUserData()
        logger.info('FILE_OP: Logo upload success', { category: 'FILE_OP' })
        showSuccess('הלוגו הועלה בהצלחה')
        setLogoPreviewUrl(null)
        setLogoFile(null)
      } else {
        const error = await res.json()
        logger.error('FILE_OP: Logo upload failed', undefined, { category: 'FILE_OP', status: res.status, errorMessage: error.message })
        showError(error.message || 'שגיאה בהעלאת הלוגו')
      }
    } catch (error) {
      logger.error('FILE_OP: Logo upload error', error instanceof Error ? error : undefined, { category: 'FILE_OP' })
      showError('שגיאה בהעלאת הלוגו')
    } finally {
      setUploading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-mesh">
        <div className="text-center animate-fade-in">
          <div className="loading-spinner mx-auto mb-4" />
          <p className="text-foreground-muted">טוען...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  // Use userData's role when viewing as another user, otherwise use session role
  const effectiveRole = isViewingAsOther && userData?.role ? userData.role : session.user.role
  const isAgent = effectiveRole === 'AGENT'
  const isAdmin = effectiveRole === 'ADMIN'

  // CLIENT welcome: show only minimal background, the SweetAlert handles everything
  if (isClientWelcome) {
    return (
      <div className="min-h-screen bg-background bg-mesh bg-grid flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="loading-spinner mx-auto mb-4" />
          <p className="text-foreground-muted">טוען...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout showHeader={false} showFooter={false}>
      <div className={`min-h-screen overflow-x-hidden relative bg-mesh bg-grid ${isAdmin ? 'bg-[#0a1a0f]' : isAgent ? 'bg-[#050a14]' : 'bg-background'}`}>
        {/* Glow Effects */}
        {isAdmin && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-emerald-500/30 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-green-500/25 rounded-full blur-[100px]" />
          </div>
        )}
        {isAgent && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-blue-600/30 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-500/25 rounded-full blur-[100px]" />
          </div>
        )}

        {/* Header */}
        <header className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b ${isAdmin ? 'bg-[#0a1a0f]/90 border-emerald-500/20' : isAgent ? 'bg-[#050a14]/90 border-blue-500/20' : 'bg-background/90 border-white/10'}`}>
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {!isWelcome ? (
                <button
                  onClick={handleGoBack}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${isAdmin ? 'hover:bg-emerald-500/10 text-emerald-400' : isAgent ? 'hover:bg-blue-500/10 text-blue-400' : 'hover:bg-white/10 text-primary'}`}
                >
                  <ArrowRight size={20} />
                  <span>חזרה</span>
                </button>
              ) : (
                <div className="w-24" />
              )}
              <h1 className={`text-xl font-bold ${isAdmin ? 'text-emerald-400' : isAgent ? 'text-blue-400' : 'text-primary'}`}>
                {isWelcome ? 'השלמת פרופיל' : 'הגדרות'}
              </h1>
              <div className="w-24" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 pt-24 pb-32 relative z-10">
          {/* Welcome Banner for New Users */}
          {isWelcome && (
            <div className="mb-8 animate-fade-in-up">
              <div className={`glass-card rounded-2xl p-6 text-center ${isAgent ? 'border-blue-500/30' : 'border-primary/30'}`}>
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${isAgent ? 'bg-blue-500/20' : 'bg-primary/20'}`}>
                  <PartyPopper size={32} className={isAgent ? 'text-blue-400' : 'text-primary'} />
                </div>
                <h2 className={`text-2xl font-bold mb-2 ${isAgent ? 'text-blue-400' : 'text-primary'}`}>
                  ברוך הבא למערכת!
                </h2>
                <p className="text-foreground-muted mb-4">
                  {isAgent
                    ? 'אנא השלם את פרטי הפרופיל שלך והעלה לוגו כדי להתחיל'
                    : 'אנא השלם את פרטי הפרופיל שלך כדי להתחיל'
                  }
                </p>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Sparkles size={16} className={isAgent ? 'text-blue-400' : 'text-primary'} />
                  <span className="text-foreground-muted">מלא את הפרטים ולחץ על שמור להמשך</span>
                </div>
              </div>
            </div>
          )}

          {/* Logo Section - For Agents and Admins */}
          {(isAgent || isAdmin) && (
            <div className="mb-8 animate-fade-in-up">
              <div className={`glass-card rounded-2xl p-6 ${isAdmin ? 'border-emerald-500/20' : isAgent ? 'border-blue-500/20' : ''}`}>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Camera size={20} className={isAdmin ? 'text-emerald-400' : isAgent ? 'text-blue-400' : 'text-primary'} />
                  {isAdmin ? 'תמונת פרופיל' : 'לוגו'}
                </h2>

                {/* Show current logo if exists */}
                {userData?.logoUrl && !logoPreviewUrl && (
                  <div className="flex flex-col items-center gap-4 mb-4">
                    <div className={`w-32 h-32 rounded-full overflow-hidden border-4 ${
                      isAdmin ? 'border-emerald-500/30' : isAgent ? 'border-blue-500/30' : 'border-primary/30'
                    } ${uploading ? 'opacity-50' : ''}`}>
                      {uploading ? (
                        <div className="w-full h-full flex items-center justify-center bg-white/10">
                          <Loader2 size={32} className={`animate-spin ${isAdmin ? 'text-emerald-400' : isAgent ? 'text-blue-400' : 'text-primary'}`} />
                        </div>
                      ) : (
                        <img
                          src={withFreshCacheBust(userData.logoUrl)}
                          alt="לוגו"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <p className="text-sm text-foreground-muted">לוגו נוכחי - להחלפה העלה תמונה חדשה למטה</p>
                  </div>
                )}

                {/* ImageCropper for uploading new logo */}
                <ImageCropper
                  ref={imageCropperRef}
                  onImageCropped={handleImageCropped}
                  aspectRatio={1}
                  circularCrop={true}
                  maxWidth={400}
                  maxHeight={400}
                />
              </div>
            </div>
          )}

          {/* Profile Section */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className={`glass-card rounded-2xl p-6 ${isAdmin ? 'border-emerald-500/20' : isAgent ? 'border-blue-500/20' : ''}`}>
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <User size={20} className={isAdmin ? 'text-emerald-400' : isAgent ? 'text-blue-400' : 'text-primary'} />
                פרטים אישיים
              </h2>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm text-foreground-muted mb-2 flex items-center gap-2">
                    <User size={14} />
                    שם מלא
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-xl bg-white/5 border transition-all focus:outline-none ${
                      isAdmin ? 'border-emerald-500/20 focus:border-emerald-500/50' : isAgent ? 'border-blue-500/20 focus:border-blue-500/50' : 'border-white/10 focus:border-primary/50'
                    }`}
                    placeholder="הזן שם מלא"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm text-foreground-muted mb-2 flex items-center gap-2">
                    <Mail size={14} />
                    אימייל
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-xl bg-white/5 border transition-all focus:outline-none ${
                      isAdmin ? 'border-emerald-500/20 focus:border-emerald-500/50' : isAgent ? 'border-blue-500/20 focus:border-blue-500/50' : 'border-white/10 focus:border-primary/50'
                    }`}
                    placeholder="הזן אימייל"
                    dir="ltr"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm text-foreground-muted mb-2 flex items-center gap-2">
                    <Phone size={14} />
                    טלפון
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-xl bg-white/5 border transition-all focus:outline-none ${
                      isAdmin ? 'border-emerald-500/20 focus:border-emerald-500/50' : isAgent ? 'border-blue-500/20 focus:border-blue-500/50' : 'border-white/10 focus:border-primary/50'
                    }`}
                    placeholder="הזן מספר טלפון"
                    dir="ltr"
                  />
                </div>

                {/* ID Number */}
                <div>
                  <label className="block text-sm text-foreground-muted mb-2 flex items-center gap-2">
                    <IdCard size={14} />
                    תעודת זהות
                  </label>
                  <input
                    type="text"
                    value={formData.idNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, idNumber: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-xl bg-white/5 border transition-all focus:outline-none ${
                      isAdmin ? 'border-emerald-500/20 focus:border-emerald-500/50' : isAgent ? 'border-blue-500/20 focus:border-blue-500/50' : 'border-white/10 focus:border-primary/50'
                    }`}
                    placeholder="הזן מספר ת.ז"
                    dir="ltr"
                  />
                </div>

                {/* Role Display */}
                <div>
                  <label className="block text-sm text-foreground-muted mb-2 flex items-center gap-2">
                    <Building2 size={14} />
                    תפקיד
                  </label>
                  <div className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${
                    isAdmin ? 'border-emerald-500/20' : isAgent ? 'border-blue-500/20' : 'border-white/10'
                  }`}>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      isAdmin ? 'bg-emerald-500/20 text-emerald-400' : isAgent ? 'bg-blue-500/20 text-blue-400' : 'bg-primary/20 text-primary'
                    }`}>
                      {isAdmin ? 'מנהל ראשי' : isAgent ? 'סוכן' : 'לקוח'}
                    </span>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`w-full mt-6 px-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                    isAdmin
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700'
                      : isAgent
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                        : 'bg-gradient-to-r from-primary to-accent hover:opacity-90'
                  } text-white disabled:opacity-50`}
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {isWelcome ? 'מסיים...' : 'שומר...'}
                    </>
                  ) : (
                    <>
                      {isWelcome ? <Sparkles size={18} /> : <Save size={18} />}
                      {isWelcome ? 'סיים והמשך' : 'שמור שינויים'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </AppLayout>
  )
}
