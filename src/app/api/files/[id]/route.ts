import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { unlink } from 'fs/promises'
import path from 'path'

// PUT - Update file notes
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
    const { notes } = body

    const file = await prisma.file.findUnique({
      where: { id },
      include: {
        folder: {
          include: {
            user: { select: { agentId: true } },
          },
        },
      },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (session.user.role === 'AGENT') {
      if (file.folder.user.agentId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const updatedFile = await prisma.file.update({
      where: { id },
      data: { notes },
    })

    return NextResponse.json(updatedFile)
  } catch (error) {
    console.error('Error updating file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete file
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

    const file = await prisma.file.findUnique({
      where: { id },
      include: {
        folder: {
          include: {
            user: { select: { agentId: true } },
          },
        },
      },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (session.user.role === 'AGENT') {
      if (file.folder.user.agentId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Delete physical file
    try {
      const filePath = path.join(process.cwd(), 'public', file.url)
      await unlink(filePath)
    } catch {
      // File might not exist, continue anyway
    }

    // Delete from database
    await prisma.file.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
