'use client'

import { useSession } from 'next-auth/react'
import Header from './Header'
import Footer from './Footer'
import { PageTransition } from '@/components/ui'

interface AppLayoutProps {
  children: React.ReactNode
  showHeader?: boolean
  showFooter?: boolean
}

export default function AppLayout({
  children,
  showHeader = true,
  showFooter = true
}: AppLayoutProps) {
  const { data: session } = useSession()

  // Don't show layout on login page
  if (!session) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen gradient-mesh">
      {showHeader && <Header />}

      <main className={`
        ${showHeader ? 'pt-16' : ''}
        ${showFooter ? 'pb-20 md:pb-0' : ''}
        min-h-screen
      `}>
        <PageTransition>
          {children}
        </PageTransition>
      </main>

      {showFooter && <Footer />}
    </div>
  )
}
