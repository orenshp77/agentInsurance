'use client'

import { useEffect } from 'react'
import { setupGlobalErrorHandler } from '@/lib/logger'

export default function ErrorLogger() {
  useEffect(() => {
    setupGlobalErrorHandler()
  }, [])

  return null
}
