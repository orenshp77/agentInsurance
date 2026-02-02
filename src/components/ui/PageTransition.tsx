'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'

interface PageTransitionProps {
  children: React.ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showLoader, setShowLoader] = useState(false)
  const previousPathname = useRef(pathname)
  const loaderTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Only trigger transition on actual page navigation
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname
      setIsTransitioning(true)

      // Clear any existing timeouts
      if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current)
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)

      // Show loader only after 500ms delay (to avoid flashing on fast loads)
      loaderTimeoutRef.current = setTimeout(() => {
        if (isTransitioning) {
          setShowLoader(true)
        }
      }, 500)

      // Complete transition after 600ms
      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false)
        setShowLoader(false)
      }, 600)
    }

    return () => {
      if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current)
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
    }
  }, [pathname])

  return (
    <>
      {/* Loading Overlay with Gears - only shows after delay */}
      {showLoader && (
        <div className="loading-overlay">
          <div className="relative flex items-center justify-center">
            {/* Main Gear */}
            <svg
              viewBox="0 0 100 100"
              className="w-20 h-20 text-primary animate-gear"
              fill="currentColor"
            >
              <path d="M97.6,55.7V44.3l-13.6-2.9c-0.8-3.4-2.1-6.6-3.8-9.5l8.1-11.4l-8-8l-11.4,8.1c-2.9-1.7-6.1-3-9.5-3.8L56.5,3.2H45.1l-2.9,13.6c-3.4,0.8-6.6,2.1-9.5,3.8l-11.4-8.1l-8,8l8.1,11.4c-1.7,2.9-3,6.1-3.8,9.5L3.9,44.3v11.4l13.6,2.9c0.8,3.4,2.1,6.6,3.8,9.5l-8.1,11.4l8,8l11.4-8.1c2.9,1.7,6.1,3,9.5,3.8l2.9,13.6h11.4l2.9-13.6c3.4-0.8,6.6-2.1,9.5-3.8l11.4,8.1l8-8l-8.1-11.4c1.7-2.9,3-6.1,3.8-9.5L97.6,55.7z M50.8,65.8c-8.7,0-15.8-7.1-15.8-15.8s7.1-15.8,15.8-15.8S66.6,41.3,66.6,50S59.5,65.8,50.8,65.8z"/>
            </svg>

            {/* Small Gear - Top Right */}
            <svg
              viewBox="0 0 100 100"
              className="w-10 h-10 text-accent absolute -top-4 -right-4 animate-gear-reverse"
              fill="currentColor"
            >
              <path d="M97.6,55.7V44.3l-13.6-2.9c-0.8-3.4-2.1-6.6-3.8-9.5l8.1-11.4l-8-8l-11.4,8.1c-2.9-1.7-6.1-3-9.5-3.8L56.5,3.2H45.1l-2.9,13.6c-3.4,0.8-6.6,2.1-9.5,3.8l-11.4-8.1l-8,8l8.1,11.4c-1.7,2.9-3,6.1-3.8,9.5L3.9,44.3v11.4l13.6,2.9c0.8,3.4,2.1,6.6,3.8,9.5l-8.1,11.4l8,8l11.4-8.1c2.9,1.7,6.1,3,9.5,3.8l2.9,13.6h11.4l2.9-13.6c3.4-0.8,6.6-2.1,9.5-3.8l11.4,8.1l8-8l-8.1-11.4c1.7-2.9,3-6.1,3.8-9.5L97.6,55.7z M50.8,65.8c-8.7,0-15.8-7.1-15.8-15.8s7.1-15.8,15.8-15.8S66.6,41.3,66.6,50S59.5,65.8,50.8,65.8z"/>
            </svg>

            {/* Small Gear - Bottom Left */}
            <svg
              viewBox="0 0 100 100"
              className="w-8 h-8 text-secondary absolute -bottom-2 -left-6 animate-gear-fast"
              fill="currentColor"
            >
              <path d="M97.6,55.7V44.3l-13.6-2.9c-0.8-3.4-2.1-6.6-3.8-9.5l8.1-11.4l-8-8l-11.4,8.1c-2.9-1.7-6.1-3-9.5-3.8L56.5,3.2H45.1l-2.9,13.6c-3.4,0.8-6.6,2.1-9.5,3.8l-11.4-8.1l-8,8l8.1,11.4c-1.7,2.9-3,6.1-3.8,9.5L3.9,44.3v11.4l13.6,2.9c0.8,3.4,2.1,6.6,3.8,9.5l-8.1,11.4l8,8l11.4-8.1c2.9,1.7,6.1,3,9.5,3.8l2.9,13.6h11.4l2.9-13.6c3.4-0.8,6.6-2.1,9.5-3.8l11.4,8.1l8-8l-8.1-11.4c1.7-2.9,3-6.1,3.8-9.5L97.6,55.7z M50.8,65.8c-8.7,0-15.8-7.1-15.8-15.8s7.1-15.8,15.8-15.8S66.6,41.3,66.6,50S59.5,65.8,50.8,65.8z"/>
            </svg>
          </div>

          {/* Loading Text */}
          <p className="mt-6 text-foreground-muted animate-pulse">טוען...</p>
        </div>
      )}

      {/* Page Content */}
      <div className={isTransitioning ? 'page-exit' : 'page-enter'}>
        {children}
      </div>
    </>
  )
}
