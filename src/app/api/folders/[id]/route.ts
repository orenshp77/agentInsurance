import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// GET - Get single folder with files
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, agentId: true },
        },
        files: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Check permissions
    if (session.user.role === 'ADMIN') {
      // Admin can see any folder
    } else if (session.user.role === 'AGENT') {
      // Agent can only see their clients' folders
      if (folder.user.agentId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      // Client can only see their own folders
      if (folder.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(folder)
  } catch (error) {
    console.error('Error fetching folder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update folder
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role === 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, category } = body

    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        user: { select: { agentId: true } },
      },
    })

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Check permissions
    if (session.user.role === 'AGENT') {
      if (folder.user.agentId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
      },
    })

    return NextResponse.json(updatedFolder)
  } catch (error) {
    console.error('Error updating folder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role === 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        user: { select: { agentId: true } },
      },
    })

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Check permissions
    if (session.user.role === 'AGENT') {
      if (folder.user.agentId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    await prisma.folder.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting folder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
