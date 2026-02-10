'use client'

import { useEffect, useState } from 'react'
import { useNetworkQuality } from '@/hooks/useNetworkQuality'
import { WifiOff, Wifi, X } from 'lucide-react'

/**
 * NetworkQualityAlert Component
 *
 * - פופאפ גדול רק כשאין אינטרנט בכלל
 * - באנר קטן כשיש איטיות
 * - נעלם אוטומטית כשהחיבור חוזר להיות תקין
 */
export default function NetworkQualityAlert() {
  const { quality, isOnline } = useNetworkQuality()
  const [showOfflinePopup, setShowOfflinePopup] = useState(false)
  const [showSlowBanner, setShowSlowBanner] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [slowDismissed, setSlowDismissed] = useState(false)

  useEffect(() => {
    // Offline - show big popup
    if (!isOnline) {
      setShowOfflinePopup(true)
      setShowSlowBanner(false)
      setIsDismissed(false)
    }
    // Back online and was showing offline popup
    else if (showOfflinePopup) {
      setShowOfflinePopup(false)
    }

    // Slow connection - show small banner (only if not dismissed)
    if (isOnline && quality === 'poor' && !slowDismissed) {
      setShowSlowBanner(true)
    }
    // Connection improved - hide banner automatically
    else if (quality === 'good' || quality === 'excellent') {
      setShowSlowBanner(false)
      setSlowDismissed(false) // Reset so it can show again if it gets slow
    }
  }, [quality, isOnline, showOfflinePopup, slowDismissed])

  const handleDismissOffline = () => {
    setIsDismissed(true)
    setShowOfflinePopup(false)
  }

  const handleDismissSlow = () => {
    setSlowDismissed(true)
    setShowSlowBanner(false)

    // Reset after 2 minutes
    setTimeout(() => {
      setSlowDismissed(false)
    }, 2 * 60 * 1000)
  }

  // Small banner for slow connection
  if (showSlowBanner && isOnline) {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[9999] animate-slide-up"
      >
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg shadow-lg p-3 flex items-center gap-3">
          <Wifi className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800 flex-1">
            רשת סלולרית איטית
          </p>
          <button
            onClick={handleDismissSlow}
            className="text-yellow-600 hover:text-yellow-800 p-1"
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <style jsx>{`
          @keyframes slide-up {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-slide-up {
            animation: slide-up 0.3s ease-out;
          }
        `}</style>
      </div>
    )
  }

  // Big popup only when completely offline
  if (!showOfflinePopup || isDismissed) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998]"
        style={{ animation: 'fadeIn 0.3s ease-out' }}
      />

      {/* Offline Popup */}
      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] w-[90%] max-w-sm"
        style={{ animation: 'slideInScale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        <div className="bg-white border-2 border-red-400 rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-2 bg-red-500" />

          <div className="p-6 text-center">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 rounded-full p-4">
                <WifiOff className="w-10 h-10 text-red-500" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              אין חיבור לאינטרנט
            </h3>

            {/* Message */}
            <p className="text-gray-600 mb-4">
              בדוק את החיבור שלך ונסה שוב
            </p>

            {/* Button */}
            <button
              onClick={handleDismissOffline}
              className="w-full bg-red-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-red-600 transition-colors"
            >
              הבנתי
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInScale {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </>
  )
}
