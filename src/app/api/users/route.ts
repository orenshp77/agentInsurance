import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// Disable caching for this route
export const dynamic = 'force-dynamic'

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500) // Max 500
    const offset = parseInt(searchParams.get('offset') || '0')

    let users
    let total = 0

    if (session.user.role === 'ADMIN') {
      // Admin can see all users, optionally filtered by agentId
      const whereClause: Record<string, unknown> = {}
      if (role) {
        whereClause.role = role as 'ADMIN' | 'AGENT' | 'CLIENT'
      }
      if (agentId) {
        whereClause.agentId = agentId
      }

      const where = Object.keys(whereClause).length > 0 ? whereClause : undefined

      ;[users, total] = await Promise.all([
        prisma.user.findMany({
          where,
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
            agent: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: { clients: true, folders: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.user.count({ where }),
      ])
    } else if (session.user.role === 'AGENT') {
      // Agent can only see their clients
      const where = {
        agentId: session.user.id,
        role: 'CLIENT' as const,
      }

      ;[users, total] = await Promise.all([
        prisma.user.findMany({
          where,
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
          take: limit,
          skip: offset,
        }),
        prisma.user.count({ where }),
      ])
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Convert logoUrl filenames to proxy URLs (for CORS-free local development)
    const usersWithProxyLogos = users.map(user => {
      const logoUrl = 'logoUrl' in user ? (user.logoUrl as string | null) : null
      return {
        ...user,
        logoUrl: logoUrl && typeof logoUrl === 'string' && !logoUrl.startsWith('http')
          ? `/api/logo-proxy?filename=${encodeURIComponent(logoUrl)}`
          : logoUrl,
      }
    })

    return NextResponse.json(
      { users: usersWithProxyLogos, total, limit, offset },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
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
    const { email, password, name, phone, role, idNumber, logoUrl, agentId: requestAgentId } = body

    // Validation
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'שם הוא שדה חובה' },
        { status: 400 }
      )
    }
    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'אימייל הוא שדה חובה' },
        { status: 400 }
      )
    }
    if (!password && !body.skipPassword) {
      return NextResponse.json(
        { error: 'סיסמה היא שדה חובה' },
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
        { error: 'אימייל זה כבר קיים במערכת' },
        { status: 400 }
      )
    }

    // Check if idNumber already exists
    if (idNumber?.trim()) {
      const existingIdNumber = await prisma.user.findUnique({
        where: { idNumber },
      })
      if (existingIdNumber) {
        return NextResponse.json(
          { error: 'תעודת זהות זו כבר קיימת במערכת' },
          { status: 400 }
        )
      }
    }

    // Check if phone already exists
    if (phone?.trim()) {
      const existingPhone = await prisma.user.findFirst({
        where: { phone },
      })
      if (existingPhone) {
        return NextResponse.json(
          { error: 'מספר טלפון זה כבר קיים במערכת' },
          { status: 400 }
        )
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Determine agentId:
    // - If agent creates client: use agent's own ID
    // - If admin creates client with agentId: use provided agentId
    let finalAgentId: string | undefined = undefined
    if (session.user.role === 'AGENT') {
      finalAgentId = session.user.id
    } else if (session.user.role === 'ADMIN' && requestAgentId && role === 'CLIENT') {
      finalAgentId = requestAgentId
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role: session.user.role === 'AGENT' ? 'CLIENT' : (role || 'CLIENT'),
        idNumber,
        agentId: finalAgentId,
        logoUrl: role === 'AGENT' ? logoUrl : undefined,
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
  } catch (error: unknown) {
    console.error('Error creating user:', error)
    // Handle Prisma unique constraint errors
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
    return NextResponse.json({ error: 'שגיאה ביצירת המשתמש' }, { status: 500 })
  }
}
