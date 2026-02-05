'use client'

import { useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { createLogger } from '@/lib/logger'

export function useLogger(componentName: string) {
  const { data: session } = useSession()

  const logger = useMemo(() => createLogger(componentName), [componentName])

  useEffect(() => {
    if (session?.user) {
      logger.setUser({
        id: session.user.id,
        name: session.user.name || undefined,
        role: session.user.role,
      })
    }
  }, [session, logger])

  return logger
}
