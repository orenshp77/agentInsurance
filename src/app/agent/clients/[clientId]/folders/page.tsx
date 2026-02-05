import { Suspense } from 'react'
import ClientFoldersAgentContent from './ClientFoldersAgentContent'

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl">טוען...</div>
    </div>
  )
}

export default function ClientFoldersPage({ params }: { params: Promise<{ clientId: string }> }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ClientFoldersAgentContent params={params} />
    </Suspense>
  )
}
