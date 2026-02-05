import { Suspense } from 'react'
import ClientFoldersContent from './ClientFoldersContent'

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl">טוען...</div>
    </div>
  )
}

export default function ClientFoldersPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ClientFoldersContent />
    </Suspense>
  )
}
