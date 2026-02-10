import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSignedUrl } from '@/lib/gcs'

// Proxy endpoint for logo images to avoid CORS issues
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 })
    }

    // Get signed URL for the file
    const signedUrl = await getSignedUrl(filename)

    // Fetch the image from GCS
    const response = await fetch(signedUrl)

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status })
    }

    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/png'

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error('Error proxying logo:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
