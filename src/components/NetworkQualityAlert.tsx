'use client'

import { useEffect, useState } from 'react'
import { useNetworkQuality } from '@/hooks/useNetworkQuality'
import { WifiOff, Wifi } from 'lucide-react'

/**
 * NetworkQualityAlert Component
 *
 * מציג התראה מעוצבת כשחיבור האינטרנט חלש
 * - זיהוי אוטומטי של איכות חיבור
 * - אנימציות חלקות
 * - עיצוב מקצועי
 * - תמיכה ב-RTL
 */
export default function NetworkQualityAlert() {
  const { quality, isOnline, downlink, rtt } = useNetworkQuality()
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Show alert if connection is poor or offline
    if (!isDismissed && (quality === 'poor' || quality === 'offline')) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [quality, isDismissed])

  const handleDismiss = () => {
    setIsDismissed(true)
    setIsVisible(false)

    // Reset dismiss after 5 minutes
    setTimeout(() => {
      setIsDismissed(false)
    }, 5 * 60 * 1000)
  }

  if (!isVisible) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998] transition-opacity duration-300"
        style={{
          animation: 'fadeIn 0.3s ease-out',
        }}
      />

      {/* Alert Card */}
      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999]
                   w-[90%] max-w-md"
        style={{
          animation: 'slideInScale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-400
                       rounded-2xl shadow-2xl overflow-hidden">
          {/* Animated Top Bar */}
          <div className="h-2 bg-gradient-to-r from-orange-400 via-red-400 to-orange-400
                         animate-gradient-x" />

          <div className="p-6 relative">
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 left-4 text-gray-500 hover:text-gray-700
                       transition-colors duration-200"
              aria-label="סגור"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                {/* Pulsing Circle */}
                <div className="absolute inset-0 bg-orange-400 rounded-full
                               animate-ping opacity-40" />
                <div className="relative bg-white rounded-full p-4 shadow-lg">
                  {isOnline ? (
                    <Wifi className="w-10 h-10 text-orange-500 animate-pulse" />
                  ) : (
                    <WifiOff className="w-10 h-10 text-red-500 animate-bounce" />
                  )}
                </div>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-3">
              {isOnline ? '⚠️ קליטת אינטרנט חלשה' : '❌ אין חיבור לאינטרנט'}
            </h3>

            {/* Message */}
            <div className="bg-white/70 rounded-xl p-4 mb-4 text-center backdrop-blur-sm">
              <p className="text-gray-800 text-lg leading-relaxed">
                {isOnline ? (
                  <>
                    שמנו לב שאתה נמצא באזור עם <strong>קליטת אינטרנט חלשה</strong>.
                    <br />
                    <span className="text-orange-600 font-semibold">
                      מומלץ לעבור לאזור עם קליטה טובה יותר
                    </span>
                    <br />
                    כדי לקבל את <strong>מיטב השירות</strong> מהאתר.
                  </>
                ) : (
                  <>
                    <strong>החיבור לאינטרנט נותק.</strong>
                    <br />
                    <span className="text-red-600 font-semibold">
                      אנא בדוק את החיבור שלך ונסה שוב.
                    </span>
                  </>
                )}
              </p>
            </div>

            {/* Connection Stats */}
            {isOnline && (downlink || rtt) && (
              <div className="bg-white/50 rounded-lg p-3 mb-4 text-sm">
                <div className="grid grid-cols-2 gap-2 text-center">
                  {downlink && (
                    <div>
                      <div className="text-gray-500 text-xs mb-1">מהירות</div>
                      <div className="font-bold text-orange-600">
                        {downlink.toFixed(1)} Mbps
                      </div>
                    </div>
                  )}
                  {rtt && (
                    <div>
                      <div className="text-gray-500 text-xs mb-1">זמן תגובה</div>
                      <div className="font-bold text-orange-600">{rtt} ms</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900 font-medium mb-2">💡 טיפים לשיפור החיבור:</p>
              <ul className="text-sm text-blue-800 space-y-1 mr-4">
                <li>• עבור למקום עם קליטה טובה יותר</li>
                <li>• התחבר לרשת Wi-Fi מהירה ויציבה</li>
                <li>• בדוק שאין אפליקציות שגוזלות רוחב פס</li>
                {!isOnline && <li className="text-red-600 font-semibold">• בדוק את נתב האינטרנט</li>}
              </ul>
            </div>

            {/* Action Button */}
            <button
              onClick={handleDismiss}
              className="w-full mt-4 bg-gradient-to-r from-orange-500 to-red-500
                       text-white font-bold py-3 px-6 rounded-xl
                       hover:from-orange-600 hover:to-red-600
                       transform hover:scale-105 transition-all duration-200
                       shadow-lg hover:shadow-xl"
            >
              הבנתי, תודה!
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
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

        @keyframes gradient-x {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </>
  )
}
