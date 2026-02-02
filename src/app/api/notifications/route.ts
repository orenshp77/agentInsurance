import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get notifications for current user
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
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

    const { userId, title, description, type } = await req.json()

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
