import { Suspense } from 'react'
import ClientFolderFilesContent from './ClientFolderFilesContent'

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl">טוען...</div>
    </div>
  )
}

export default function ClientFolderFilesPage({
  params,
}: {
  params: Promise<{ folderId: string }>
}) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ClientFolderFilesContent params={params} />
    </Suspense>
  )
}
