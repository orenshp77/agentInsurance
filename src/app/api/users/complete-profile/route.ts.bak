import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// POST - Mark user profile as completed
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { profileCompleted: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error completing profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
