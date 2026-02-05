import { Suspense } from 'react'
import FolderFilesContent from './FolderFilesContent'

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl">טוען...</div>
    </div>
  )
}

export default function FolderFilesPage({
  params,
}: {
  params: Promise<{ clientId: string; folderId: string }>
}) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <FolderFilesContent params={params} />
    </Suspense>
  )
}
