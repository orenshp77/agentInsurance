import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// GET - Get recent activities
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    // Only ADMIN can see all activities
    // AGENT sees activities related to their clients
    // CLIENT sees only their own activities

    let whereClause = {}

    if (session.user.role === 'CLIENT') {
      whereClause = { userId: session.user.id }
    } else if (session.user.role === 'AGENT') {
      // Get agent's client IDs
      const clients = await prisma.user.findMany({
        where: { agentId: session.user.id },
        select: { id: true },
      })
      const clientIds = clients.map(c => c.id)

      // Agent sees:
      // 1. Their own activities (userId = agent)
      // 2. Activities by their clients (userId in clientIds)
      // 3. File uploads for their clients (metadata contains clientId)
      whereClause = {
        OR: [
          { userId: session.user.id },
          { userId: { in: clientIds } },
          // Also include activities where metadata contains one of their client IDs
          ...clientIds.map(clientId => ({
            metadata: { contains: clientId }
          }))
        ],
      }
    }
    // ADMIN sees all - no filter

    const activities = await prisma.activity.findMany({
      where: whereClause,
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
