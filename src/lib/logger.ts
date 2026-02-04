// Client-side logging utility with device detection

export interface DeviceInfo {
  userAgent: string
  platform: string
  language: string
  screenWidth: number
  screenHeight: number
  deviceType: 'mobile' | 'tablet' | 'desktop'
  browser: string
  browserVersion: string
  os: string
  osVersion: string
  isTouchDevice: boolean
}

export interface LogEntry {
  message: string
  errorLevel: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  stack?: string
  componentName?: string
  userId?: string
  deviceInfo?: DeviceInfo
  url?: string
  metadata?: Record<string, unknown>
}

// Detect device information from user agent
export function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      userAgent: 'server',
      platform: 'server',
      language: 'he',
      screenWidth: 0,
      screenHeight: 0,
      deviceType: 'desktop',
      browser: 'server',
      browserVersion: '0',
      os: 'server',
      osVersion: '0',
      isTouchDevice: false,
    }
  }

  const ua = navigator.userAgent
  const platform = navigator.platform

  // Detect browser
  let browser = 'Unknown'
  let browserVersion = '0'

  if (ua.includes('Firefox/')) {
    browser = 'Firefox'
    browserVersion = ua.split('Firefox/')[1]?.split(' ')[0] || '0'
  } else if (ua.includes('Edg/')) {
    browser = 'Edge'
    browserVersion = ua.split('Edg/')[1]?.split(' ')[0] || '0'
  } else if (ua.includes('Chrome/')) {
    browser = 'Chrome'
    browserVersion = ua.split('Chrome/')[1]?.split(' ')[0] || '0'
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browser = 'Safari'
    browserVersion = ua.split('Version/')[1]?.split(' ')[0] || '0'
  } else if (ua.includes('Opera') || ua.includes('OPR/')) {
    browser = 'Opera'
    browserVersion = ua.split('OPR/')[1]?.split(' ')[0] || ua.split('Opera/')[1]?.split(' ')[0] || '0'
  }

  // Detect OS
  let os = 'Unknown'
  let osVersion = '0'

  if (ua.includes('Windows')) {
    os = 'Windows'
    const match = ua.match(/Windows NT (\d+\.\d+)/)
    osVersion = match ? match[1] : '0'
  } else if (ua.includes('Mac OS X')) {
    os = 'macOS'
    const match = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/)
    osVersion = match ? match[1].replace(/_/g, '.') : '0'
  } else if (ua.includes('Android')) {
    os = 'Android'
    const match = ua.match(/Android (\d+\.?\d*)/)
    osVersion = match ? match[1] : '0'
  } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS'
    const match = ua.match(/OS (\d+[._]\d+[._]?\d*)/)
    osVersion = match ? match[1].replace(/_/g, '.') : '0'
  } else if (ua.includes('Linux')) {
    os = 'Linux'
    osVersion = '0'
  }

  // Detect device type
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop'

  if (/Mobi|Android/i.test(ua) && !/Tablet|iPad/i.test(ua)) {
    deviceType = 'mobile'
  } else if (/Tablet|iPad/i.test(ua)) {
    deviceType = 'tablet'
  }

  return {
    userAgent: ua,
    platform,
    language: navigator.language,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    deviceType,
    browser,
    browserVersion,
    os,
    osVersion,
    isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
  }
}

// Send log to server
export async function sendLog(entry: LogEntry): Promise<void> {
  try {
    const deviceInfo = getDeviceInfo()

    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...entry,
        deviceInfo,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch (error) {
    // Silent fail - don't want logging to break the app
    console.error('Failed to send log:', error)
  }
}

// Logger class for easy use
class Logger {
  private componentName?: string
  private userId?: string

  constructor(componentName?: string) {
    this.componentName = componentName
  }

  setUserId(userId: string) {
    this.userId = userId
  }

  info(message: string, metadata?: Record<string, unknown>) {
    sendLog({
      message,
      errorLevel: 'INFO',
      componentName: this.componentName,
      userId: this.userId,
      metadata,
    })
  }

  warn(message: string, metadata?: Record<string, unknown>) {
    sendLog({
      message,
      errorLevel: 'WARNING',
      componentName: this.componentName,
      userId: this.userId,
      metadata,
    })
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>) {
    sendLog({
      message,
      errorLevel: 'ERROR',
      stack: error?.stack,
      componentName: this.componentName,
      userId: this.userId,
      metadata: {
        ...metadata,
        errorName: error?.name,
        errorMessage: error?.message,
      },
    })
  }

  critical(message: string, error?: Error, metadata?: Record<string, unknown>) {
    sendLog({
      message,
      errorLevel: 'CRITICAL',
      stack: error?.stack,
      componentName: this.componentName,
      userId: this.userId,
      metadata: {
        ...metadata,
        errorName: error?.name,
        errorMessage: error?.message,
      },
    })
  }
}

export function createLogger(componentName?: string): Logger {
  return new Logger(componentName)
}

// Global error handler setup
export function setupGlobalErrorHandler() {
  if (typeof window === 'undefined') return

  const logger = createLogger('GlobalErrorHandler')

  // Catch unhandled errors
  window.onerror = (message, source, lineno, colno, error) => {
    logger.critical(`Unhandled Error: ${message}`, error || undefined, {
      source,
      lineno,
      colno,
    })
    return false
  }

  // Catch unhandled promise rejections
  window.onunhandledrejection = (event) => {
    logger.critical('Unhandled Promise Rejection', event.reason instanceof Error ? event.reason : undefined, {
      reason: String(event.reason),
    })
  }
}

// Generate AI fix suggestion based on error
export function generateAIFixPrompt(log: {
  message: string
  stack?: string
  deviceInfo?: DeviceInfo
  metadata?: Record<string, unknown>
}): string {
  const parts = [
    '🔧 **קוד לתיקון עם Claude AI:**',
    '',
    '```',
    `שגיאה: ${log.message}`,
    '',
  ]

  if (log.stack) {
    parts.push('Stack Trace:')
    parts.push(log.stack)
    parts.push('')
  }

  if (log.deviceInfo) {
    parts.push('מידע על המכשיר:')
    parts.push(`- סוג: ${log.deviceInfo.deviceType}`)
    parts.push(`- דפדפן: ${log.deviceInfo.browser} ${log.deviceInfo.browserVersion}`)
    parts.push(`- מערכת הפעלה: ${log.deviceInfo.os} ${log.deviceInfo.osVersion}`)
    parts.push(`- מסך: ${log.deviceInfo.screenWidth}x${log.deviceInfo.screenHeight}`)
    parts.push('')
  }

  if (log.metadata) {
    parts.push('מידע נוסף:')
    parts.push(JSON.stringify(log.metadata, null, 2))
  }

  parts.push('```')
  parts.push('')
  parts.push('העתק את הקוד למעלה ושלח ל-Claude AI לקבלת פתרון.')

  return parts.join('\n')
}
