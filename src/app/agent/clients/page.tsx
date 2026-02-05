import { Suspense } from 'react'
import ClientsContent from './ClientsContent'

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl">טוען...</div>
    </div>
  )
}

export default function AgentClientsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ClientsContent />
    </Suspense>
  )
}
