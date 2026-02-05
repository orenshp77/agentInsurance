import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Public endpoint to get agent info for registration page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params

    const agent = await prisma.user.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        logoUrl: true,
      },
    })

    if (!agent || (agent.role !== 'AGENT' && agent.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: agent.id,
      name: agent.name,
      email: agent.email,
      logoUrl: agent.logoUrl,
    })
  } catch (error) {
    console.error('Error fetching agent:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
