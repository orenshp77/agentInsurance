import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// GET - Get single user
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

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        idNumber: true,
        agentId: true,
        logoUrl: true,
        createdAt: true,
        folders: {
          select: {
            id: true,
            name: true,
            category: true,
            _count: { select: { files: true } },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check permissions
    if (session.user.role === 'ADMIN') {
      // Admin can see any user
    } else if (session.user.role === 'AGENT') {
      // Agent can only see their clients or themselves
      if (user.agentId !== session.user.id && user.id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      // Client can see themselves or their agent
      const client = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { agentId: true },
      })
      if (user.id !== session.user.id && user.id !== client?.agentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { email, password, name, phone, idNumber, logoUrl } = body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check permissions
    if (session.user.role === 'ADMIN') {
      // Admin can update any user
    } else if (session.user.role === 'AGENT') {
      // Agent can update themselves or their clients
      if (existingUser.id !== session.user.id && existingUser.agentId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (session.user.role === 'CLIENT') {
      // Client can only update themselves
      if (existingUser.id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check email uniqueness if changing email
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } })
      if (emailExists) {
        return NextResponse.json({ error: 'אימייל זה כבר קיים במערכת' }, { status: 400 })
      }
    }

    // Check idNumber uniqueness if changing idNumber
    if (idNumber !== undefined && idNumber?.trim() && idNumber !== existingUser.idNumber) {
      const idNumberExists = await prisma.user.findUnique({ where: { idNumber } })
      if (idNumberExists) {
        return NextResponse.json({ error: 'תעודת זהות זו כבר קיימת במערכת' }, { status: 400 })
      }
    }

    // Check phone uniqueness if changing phone
    if (phone !== undefined && phone?.trim() && phone !== existingUser.phone) {
      const phoneExists = await prisma.user.findFirst({ where: { phone } })
      if (phoneExists) {
        return NextResponse.json({ error: 'מספר טלפון זה כבר קיים במערכת' }, { status: 400 })
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}
    if (email) updateData.email = email
    if (name) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (idNumber !== undefined) updateData.idNumber = idNumber
    if (password) updateData.password = await bcrypt.hash(password, 10)
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        idNumber: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user)
  } catch (error: unknown) {
    console.error('Error updating user:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const meta = 'meta' in error ? error.meta as Record<string, unknown> : null
      const target = meta?.target as string[] | undefined
      if (target?.includes('email')) {
        return NextResponse.json({ error: 'אימייל זה כבר קיים במערכת' }, { status: 400 })
      }
      if (target?.includes('idNumber')) {
        return NextResponse.json({ error: 'תעודת זהות זו כבר קיימת במערכת' }, { status: 400 })
      }
      return NextResponse.json({ error: 'ערך זה כבר קיים במערכת' }, { status: 400 })
    }
    return NextResponse.json({ error: 'שגיאה בעדכון המשתמש' }, { status: 500 })
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if user exists with their clients count
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        clients: true,
        folders: true,
      },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check permissions
    if (session.user.role === 'ADMIN') {
      // Admin can delete any user except themselves
      if (existingUser.id === session.user.id) {
        return NextResponse.json(
          { error: 'Cannot delete yourself' },
          { status: 400 }
        )
      }
    } else if (session.user.role === 'AGENT') {
      // Agent can only delete their clients
      if (existingUser.agentId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If deleting an agent with clients, orphan the clients instead of deleting them
    if (existingUser.role === 'AGENT' && existingUser.clients.length > 0) {
      // Update all clients to be orphaned
      await prisma.user.updateMany({
        where: { agentId: id },
        data: {
          agentId: null,
          formerAgentName: existingUser.name,
        },
      })
    }

    // Delete the user's folders and files first (if any)
    if (existingUser.folders.length > 0) {
      for (const folder of existingUser.folders) {
        await prisma.file.deleteMany({ where: { folderId: folder.id } })
      }
      await prisma.folder.deleteMany({ where: { userId: id } })
    }

    // Delete the user
    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      orphanedClients: existingUser.role === 'AGENT' ? existingUser.clients.length : 0,
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
