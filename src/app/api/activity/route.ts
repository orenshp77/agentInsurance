import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get recent clients (last 7 days)
    const recentClients = await prisma.user.findMany({
      where: {
        role: 'CLIENT',
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Get recent files (last 7 days)
    const recentFiles = await prisma.file.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true,
        fileName: true,
        createdAt: true,
        folder: {
          select: {
            id: true,
            name: true,
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Format activities
    const activities = [
      ...recentClients.map((client) => ({
        id: `client-${client.id}`,
        type: 'NEW_CLIENT' as const,
        title: `לקוח חדש נרשם: ${client.name}`,
        link: '/agent/clients',
        createdAt: client.createdAt,
      })),
      ...recentFiles.map((file) => ({
        id: `file-${file.id}`,
        type: 'NEW_FILE' as const,
        title: `קובץ חדש: ${file.fileName}`,
        subtitle: `בתיקיית ${file.folder.name} של ${file.folder.user.name}`,
        link: `/agent/clients/${file.folder.userId}/folders/${file.folder.id}`,
        createdAt: file.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Error fetching activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
