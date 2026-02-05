'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Mail, ArrowLeft, RefreshCw, Mountain } from 'lucide-react'
import { showError } from '@/lib/swal'
import { createLogger } from '@/lib/logger'

const logger = createLogger('LoginPage')

// Real landscape images from Unsplash
const landscapes = [
  {
    name: 'הרים בלילה',
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80',
    stars: true,
  },
  {
    name: 'שקיעה בהרים',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
    stars: false,
  },
  {
    name: 'אורורה בוראלית',
    image: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=80',
    stars: true,
  },
  {
    name: 'לילה כוכבי',
    image: 'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=1920&q=80',
    stars: true,
  },
  {
    name: 'הרים וערפל',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80',
    stars: false,
  },
  {
    name: 'חוף ושקיעה',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80',
    stars: false,
  },
  {
    name: 'יער בערפל',
    image: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1920&q=80',
    stars: false,
  },
  {
    name: 'שמיים סגולים',
    image: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=1920&q=80',
    stars: true,
  },
]

// Generate random stars
const generateStars = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 60,
    size: Math.random() * 2 + 1,
    delay: Math.random() * 3,
    duration: Math.random() * 2 + 2,
  }))
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailFromUrl = searchParams.get('email') || ''

  const [email, setEmail] = useState(emailFromUrl)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentBg, setCurrentBg] = useState(0)
  const [stars] = useState(() => generateStars(100))
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Log page view
  useEffect(() => {
    logger.pageView('Login')
  }, [])

  // Auto-rotate backgrounds every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      changeBackground()
    }, 30000)
    return () => clearInterval(interval)
  }, [currentBg])

  const changeBackground = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentBg((prev) => (prev + 1) % landscapes.length)
      setIsTransitioning(false)
    }, 500)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      logger.info('AUTH: Login attempt', { category: 'AUTH', email })

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        logger.warn('AUTH: Login failed - invalid credentials', { category: 'AUTH', email })
        showError('אימייל או סיסמה שגויים')
      } else {
        logger.info('AUTH: Login success - redirecting to dashboard', { category: 'AUTH', email })
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      logger.error('AUTH: Login error', err instanceof Error ? err : undefined, { category: 'AUTH', email })
      showError('שגיאה בהתחברות')
    } finally {
      setLoading(false)
    }
  }

  const landscape = landscapes[currentBg]

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pb-[20%] relative overflow-hidden">
      {/* Dynamic Background Image */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
      >
        <img
          src={landscape.image}
          alt={landscape.name}
          className="w-full h-full object-cover"
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Stars overlay for night scenes */}
      {landscape.stars && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {stars.map((star) => (
            <div
              key={star.id}
              className="absolute rounded-full bg-white animate-pulse"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
                opacity: 0.6,
              }}
            />
          ))}
          {/* Shooting star */}
          <div className="shooting-star" />
        </div>
      )}

      {/* Bottom gradient for depth */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

      {/* Background Controls */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <button
          onClick={changeBackground}
          className="glass-strong rounded-xl p-3 hover:bg-white/20 transition-all group"
          title="החלף רקע"
        >
          <RefreshCw size={18} className="text-white/80 group-hover:text-white group-hover:rotate-180 transition-all duration-500" />
        </button>
        <div className="glass-strong rounded-xl px-3 py-2 flex items-center gap-2">
          <Mountain size={14} className="text-white/60" />
          <span className="text-xs text-white/80">{landscape.name}</span>
        </div>
      </div>


      <div className="w-full max-w-[90%] sm:max-w-md md:max-w-lg relative z-10 mx-auto flex flex-col items-center justify-center">
        {/* Logo / Title */}
        <div className="text-center mb-4 sm:mb-6 animate-fade-in-up">
          {/* Logo */}
          <div className="relative inline-block mb-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 mx-auto relative">
              <img
                src="/uploads/logo-finance.png"
                alt="מגן פיננסי"
                className="w-full h-full object-contain"
                style={{ filter: 'drop-shadow(0px 0px 1px #fff)' }}
              />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 -mt-2">
            <span className="text-white drop-shadow-lg">מגן פיננסי</span>
          </h1>
          <p className="text-white/70 text-xs sm:text-sm">
            ניהול תיק חכם
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full glass-strong rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 animate-fade-in-up backdrop-blur-xl border border-white/10" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-center gap-2 mb-4 sm:mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/20" />
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">התחברות</h2>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/20" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
            {/* Email Field */}
            <div className="animate-slide-in-right opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
              <label htmlFor="email" className="block text-sm sm:text-base font-medium mb-2 text-white/70">
                אימייל
              </label>
              <div className="relative group">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 sm:py-4 pr-12 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-primary focus:bg-white/15 transition-all text-sm sm:text-base"
                  placeholder="your@email.com"
                  required
                  dir="ltr"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-primary/20 group-focus-within:bg-primary/30 transition-all">
                  <Mail size={18} className="text-primary" />
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div className="animate-slide-in-right opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
              <label htmlFor="password" className="block text-sm sm:text-base font-medium mb-2 text-white/70">
                סיסמה
              </label>
              <div className="relative group">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 sm:py-4 pr-12 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-secondary focus:bg-white/15 transition-all text-sm sm:text-base"
                  placeholder="••••••••"
                  required
                  dir="ltr"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-secondary/20 group-focus-within:bg-secondary/30 transition-all">
                  <Lock size={18} className="text-secondary" />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 sm:py-4 md:py-5 text-base sm:text-lg md:text-xl rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group animate-fade-in-up opacity-0"
              style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>התחבר למערכת</span>
                  <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* Agent Registration Button */}
            <button
              type="button"
              onClick={() => router.push('/register-agent')}
              className="w-full py-3 sm:py-4 text-sm sm:text-base rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group animate-fade-in-up opacity-0"
              style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}
            >
              <span>הרשמה כסוכן ביטוח</span>
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-white/40 text-sm mt-6 animate-fade-in opacity-0" style={{ animationDelay: '0.7s', animationFillMode: 'forwards' }}>
          © 2026 מגן פיננסי. כל הזכויות שמורות.
        </p>
      </div>

      <style jsx>{`
        @keyframes shooting {
          0% {
            transform: translateX(0) translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateX(-300px) translateY(300px);
            opacity: 0;
          }
        }
        .shooting-star {
          position: absolute;
          top: 10%;
          right: 10%;
          width: 100px;
          height: 2px;
          background: linear-gradient(to left, transparent, white);
          transform: rotate(45deg);
          animation: shooting 3s ease-in-out infinite;
          animation-delay: 5s;
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
