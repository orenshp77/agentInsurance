import { Suspense } from 'react'
import CategoryUploadContent from './CategoryUploadContent'

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl">טוען...</div>
    </div>
  )
}

export default function CategoryUploadPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CategoryUploadContent params={params} />
    </Suspense>
  )
}
