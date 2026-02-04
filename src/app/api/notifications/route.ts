import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get notifications for current user filtered by role
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    // Determine which roles the user can see notifications for
    // CLIENT: only CLIENT notifications
    // AGENT: CLIENT + AGENT notifications
    // ADMIN: all notifications (CLIENT + AGENT + ADMIN)
    let allowedRoles: ('CLIENT' | 'AGENT' | 'ADMIN')[] = ['CLIENT']
    if (session.user.role === 'AGENT') {
      allowedRoles = ['CLIENT', 'AGENT']
    } else if (session.user.role === 'ADMIN') {
      allowedRoles = ['CLIENT', 'AGENT', 'ADMIN']
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        forRole: { in: allowedRoles }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'שגיאה בטעינת ההתראות' },
      { status: 500 }
    )
  }
}

// POST - Create a new notification
export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    // Only agents and admins can create notifications
    if (session.user.role !== 'AGENT' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
    }

    const { userId, title, description, type, forRole } = await req.json()

    if (!userId || !title || !description || !type) {
      return NextResponse.json(
        { error: 'חסרים שדות חובה' },
        { status: 400 }
      )
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        description,
        type,
        forRole: forRole || 'CLIENT', // Default to CLIENT if not specified
      },
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'שגיאה ביצירת ההתראה' },
      { status: 500 }
    )
  }
}
