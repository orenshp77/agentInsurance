import { useState, useEffect } from 'react'

export type NetworkQuality = 'excellent' | 'good' | 'poor' | 'offline'

interface NetworkInfo {
  quality: NetworkQuality
  downlink?: number // Mbps
  effectiveType?: string // '4g', '3g', '2g', 'slow-2g'
  rtt?: number // Round trip time in ms
  isOnline: boolean
}

/**
 * Hook לזיהוי איכות חיבור האינטרנט
 *
 * בודק:
 * - Online/Offline status
 * - Connection speed (downlink)
 * - Network type (4G, 3G, etc.)
 * - Round trip time (latency)
 *
 * @returns NetworkInfo
 */
export function useNetworkQuality(): NetworkInfo {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    quality: 'good',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  })

  useEffect(() => {
    // Check if browser supports Network Information API
    const connection = (navigator as any).connection ||
                       (navigator as any).mozConnection ||
                       (navigator as any).webkitConnection

    const updateNetworkInfo = () => {
      const isOnline = navigator.onLine

      if (!isOnline) {
        setNetworkInfo({
          quality: 'offline',
          isOnline: false,
        })
        return
      }

      if (connection) {
        const { downlink, effectiveType, rtt } = connection

        // Determine quality based on connection metrics
        // חשוב: רק effectiveType אמין לזיהוי בעיית קליטה אמיתית
        // rtt ו-downlink יכולים להיות מושפעים מעומס השרת ולא רק מקליטה
        let quality: NetworkQuality = 'good'

        // רק רשת סלולרית גרועה באמת (2g/slow-2g) נחשבת כ"poor"
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          quality = 'poor'
        } else if (effectiveType === '4g' && downlink && downlink >= 10) {
          quality = 'excellent'
        }

        setNetworkInfo({
          quality,
          downlink,
          effectiveType,
          rtt,
          isOnline: true,
        })
      } else {
        // Fallback: Just check online status
        setNetworkInfo({
          quality: isOnline ? 'good' : 'offline',
          isOnline,
        })
      }
    }

    // Initial check
    updateNetworkInfo()

    // Listen to online/offline events
    window.addEventListener('online', updateNetworkInfo)
    window.addEventListener('offline', updateNetworkInfo)

    // Listen to connection changes
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo)
    }

    // Periodic check every 30 seconds
    const interval = setInterval(updateNetworkInfo, 30000)

    return () => {
      window.removeEventListener('online', updateNetworkInfo)
      window.removeEventListener('offline', updateNetworkInfo)
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo)
      }
      clearInterval(interval)
    }
  }, [])

  return networkInfo
}
