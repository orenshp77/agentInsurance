import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// GET - List folders
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const category = searchParams.get('category')

    let whereClause: Record<string, unknown> = {}

    if (session.user.role === 'ADMIN') {
      // Admin can see all folders
      if (userId) whereClause.userId = userId
    } else if (session.user.role === 'AGENT') {
      // Agent can see their clients' folders
      if (userId) {
        // Verify the user belongs to this agent
        const client = await prisma.user.findFirst({
          where: { id: userId, agentId: session.user.id },
        })
        if (!client) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        whereClause.userId = userId
      } else {
        // Get all folders for agent's clients
        const clientIds = await prisma.user.findMany({
          where: { agentId: session.user.id },
          select: { id: true },
        })
        whereClause.userId = { in: clientIds.map((c) => c.id) }
      }
    } else {
      // Client can only see their own folders
      whereClause.userId = session.user.id
    }

    if (category) {
      whereClause.category = category
    }

    const folders = await prisma.folder.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { files: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(folders)
  } catch (error) {
    console.error('Error fetching folders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create folder
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, category, userId } = body

    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      )
    }

    let targetUserId = userId

    if (session.user.role === 'AGENT') {
      // Agent creating folder for a client
      if (userId) {
        const client = await prisma.user.findFirst({
          where: { id: userId, agentId: session.user.id },
        })
        if (!client) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } else {
        return NextResponse.json(
          { error: 'userId is required for agents' },
          { status: 400 }
        )
      }
    } else if (session.user.role === 'CLIENT') {
      // Client can only create for themselves
      targetUserId = session.user.id
    } else if (session.user.role === 'ADMIN') {
      // Admin can create for any user
      if (!userId) {
        return NextResponse.json(
          { error: 'userId is required' },
          { status: 400 }
        )
      }
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        category,
        userId: targetUserId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json(folder, { status: 201 })
  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
