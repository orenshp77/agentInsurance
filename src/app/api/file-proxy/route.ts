import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSignedUrl } from '@/lib/gcs'

// Proxy endpoint for files to avoid CORS issues with GCS signed URLs
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    const filename = searchParams.get('filename')

    // Support both fileId (with permission check) and filename (direct)
    let gcsFilename: string

    if (fileId) {
      // Get file with permission check
      const file = await prisma.file.findUnique({
        where: { id: fileId },
        include: {
          folder: {
            include: {
              user: {
                select: { id: true, agentId: true },
              },
            },
          },
        },
      })

      if (!file) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }

      // Check access permissions
      const isAdmin = session.user.role === 'ADMIN'
      const isAgent = session.user.role === 'AGENT' && file.folder.user.agentId === session.user.id
      const isOwner = session.user.role === 'CLIENT' && file.folder.user.id === session.user.id

      if (!isAdmin && !isAgent && !isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      gcsFilename = file.url
    } else if (filename) {
      // Direct filename access (used for quick display)
      // Note: This is less secure but faster for images that are already shown
      gcsFilename = filename
    } else {
      return NextResponse.json({ error: 'fileId or filename is required' }, { status: 400 })
    }

    // Get signed URL for the file
    const signedUrl = await getSignedUrl(gcsFilename)

    // Fetch the file from GCS
    const response = await fetch(signedUrl)

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch file' }, { status: response.status })
    }

    const fileBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'application/octet-stream'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error('Error proxying file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
