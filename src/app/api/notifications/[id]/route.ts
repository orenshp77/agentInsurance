import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH - Mark notification as read
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    // Verify the notification belongs to the user
    const notification = await prisma.notification.findUnique({
      where: { id },
    })

    if (!notification) {
      return NextResponse.json({ error: 'התראה לא נמצאה' }, { status: 404 })
    }

    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
    }

    const { isRead } = await req.json()

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: isRead ?? true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'שגיאה בעדכון ההתראה' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a notification
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    // Verify the notification belongs to the user
    const notification = await prisma.notification.findUnique({
      where: { id },
    })

    if (!notification) {
      return NextResponse.json({ error: 'התראה לא נמצאה' }, { status: 404 })
    }

    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
    }

    await prisma.notification.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'שגיאה במחיקת ההתראה' },
      { status: 500 }
    )
  }
}
