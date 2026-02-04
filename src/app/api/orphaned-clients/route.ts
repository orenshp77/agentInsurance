import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// GET - Get all orphaned clients (clients without an agent)
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin can see orphaned clients
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const orphanedClients = await prisma.user.findMany({
      where: {
        role: 'CLIENT',
        agentId: null,
        formerAgentName: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        idNumber: true,
        formerAgentName: true,
        createdAt: true,
        folders: {
          select: {
            id: true,
            _count: { select: { files: true } },
          },
        },
      },
      orderBy: [
        { formerAgentName: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    // Group by former agent name
    const groupedByAgent: Record<string, typeof orphanedClients> = {}
    for (const client of orphanedClients) {
      const agentName = client.formerAgentName || 'לא ידוע'
      if (!groupedByAgent[agentName]) {
        groupedByAgent[agentName] = []
      }
      groupedByAgent[agentName].push(client)
    }

    return NextResponse.json({
      clients: orphanedClients,
      groupedByAgent,
      totalCount: orphanedClients.length,
    })
  } catch (error) {
    console.error('Error fetching orphaned clients:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Assign orphaned clients to a new agent
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin can assign orphaned clients
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { clientIds, newAgentId } = body

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ error: 'Client IDs are required' }, { status: 400 })
    }

    if (!newAgentId) {
      return NextResponse.json({ error: 'New agent ID is required' }, { status: 400 })
    }

    // Verify the new agent exists and is an agent
    const newAgent = await prisma.user.findUnique({
      where: { id: newAgentId },
    })

    if (!newAgent || newAgent.role !== 'AGENT') {
      return NextResponse.json({ error: 'Invalid agent' }, { status: 400 })
    }

    // Assign clients to new agent
    await prisma.user.updateMany({
      where: {
        id: { in: clientIds },
        role: 'CLIENT',
        agentId: null,
      },
      data: {
        agentId: newAgentId,
        formerAgentName: null,
      },
    })

    return NextResponse.json({
      success: true,
      assignedCount: clientIds.length,
      newAgentName: newAgent.name,
    })
  } catch (error) {
    console.error('Error assigning orphaned clients:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete orphaned clients
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin can delete orphaned clients
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const clientIdsParam = searchParams.get('clientIds')
    const formerAgentName = searchParams.get('formerAgentName')

    let clientIds: string[] = []

    if (clientIdsParam) {
      clientIds = clientIdsParam.split(',')
    } else if (formerAgentName) {
      // Delete all clients of a specific former agent
      const clients = await prisma.user.findMany({
        where: {
          role: 'CLIENT',
          agentId: null,
          formerAgentName,
        },
        select: { id: true },
      })
      clientIds = clients.map(c => c.id)
    }

    if (clientIds.length === 0) {
      return NextResponse.json({ error: 'No clients to delete' }, { status: 400 })
    }

    // Delete folders and files for each client
    for (const clientId of clientIds) {
      const folders = await prisma.folder.findMany({
        where: { userId: clientId },
        select: { id: true },
      })

      for (const folder of folders) {
        await prisma.file.deleteMany({ where: { folderId: folder.id } })
      }

      await prisma.folder.deleteMany({ where: { userId: clientId } })
    }

    // Delete the clients
    await prisma.user.deleteMany({
      where: {
        id: { in: clientIds },
        role: 'CLIENT',
        agentId: null,
      },
    })

    return NextResponse.json({
      success: true,
      deletedCount: clientIds.length,
    })
  } catch (error) {
    console.error('Error deleting orphaned clients:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
