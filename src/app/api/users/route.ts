import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// GET - List users (filtered by role and permissions)
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const agentId = searchParams.get('agentId')

    let users

    if (session.user.role === 'ADMIN') {
      // Admin can see all users, optionally filtered by agentId
      const whereClause: Record<string, unknown> = {}
      if (role) {
        whereClause.role = role as 'ADMIN' | 'AGENT' | 'CLIENT'
      }
      if (agentId) {
        whereClause.agentId = agentId
      }

      users = await prisma.user.findMany({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          idNumber: true,
          agentId: true,
          createdAt: true,
          _count: {
            select: { clients: true, folders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    } else if (session.user.role === 'AGENT') {
      // Agent can only see their clients
      users = await prisma.user.findMany({
        where: {
          agentId: session.user.id,
          role: 'CLIENT',
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          idNumber: true,
          createdAt: true,
          _count: {
            select: { folders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, password, name, phone, role, idNumber } = body

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password and name are required' },
        { status: 400 }
      )
    }

    // Check permissions
    if (session.user.role === 'ADMIN') {
      // Admin can create any user
    } else if (session.user.role === 'AGENT') {
      // Agent can only create clients
      if (role && role !== 'CLIENT') {
        return NextResponse.json(
          { error: 'Agents can only create clients' },
          { status: 403 }
        )
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role: session.user.role === 'AGENT' ? 'CLIENT' : (role || 'CLIENT'),
        idNumber,
        agentId: session.user.role === 'AGENT' ? session.user.id : undefined,
      },
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

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
