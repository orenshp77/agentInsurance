import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSignedUrl } from '@/lib/gcs'

// SECURITY: Get signed URL for a file (only for authorized users)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    // Get file and check permissions
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

    // Generate signed URL
    const signedUrl = await getSignedUrl(file.url)

    return NextResponse.json({ url: signedUrl })
  } catch (error) {
    console.error('Error generating signed URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
