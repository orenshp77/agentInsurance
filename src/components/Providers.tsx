'use client'

import { ReactNode, useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'
import ErrorBoundary from './ErrorBoundary'
import NetworkQualityAlert from './NetworkQualityAlert'
import { setupGlobalErrorHandler, setupNetworkMonitor } from '@/lib/logger'

interface ProvidersProps {
  children: ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    // Setup global error handler to catch unhandled errors
    setupGlobalErrorHandler()
    // Setup network connectivity monitor
    setupNetworkMonitor()
  }, [])

  return (
    <SessionProvider>
      <ErrorBoundary componentName="RootApp">
        {/* Network Quality Alert - מופיע כשהחיבור חלש */}
        <NetworkQualityAlert />
        {children}
      </ErrorBoundary>
    </SessionProvider>
  )
}
