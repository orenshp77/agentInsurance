import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * POST /api/admin/reset-system
 *
 * Resets the production system:
 * - Deletes all files, folders, notifications, activities, logs
 * - Deletes all agents and clients
 * - Keeps only admin users
 *
 * REQUIRES: Admin authentication
 * USE WITH CAUTION: This will delete all production data!
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    // Get confirmation from request body
    const body = await req.json()
    if (body.confirm !== 'RESET_PRODUCTION_DATA') {
      return NextResponse.json(
        { error: 'Confirmation required. Send { "confirm": "RESET_PRODUCTION_DATA" }' },
        { status: 400 }
      )
    }

    console.log(`🔄 System reset initiated by: ${session.user.email}`)

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete all data in correct order (respecting foreign keys)
      const deletedFiles = await tx.file.deleteMany({})
      const deletedFolders = await tx.folder.deleteMany({})
      const deletedNotifications = await tx.notification.deleteMany({})
      const deletedActivities = await tx.activity.deleteMany({})
      const deletedLogs = await tx.log.deleteMany({})

      // Delete agents and clients (keep admins)
      const deletedUsers = await tx.user.deleteMany({
        where: {
          role: {
            in: ['AGENT', 'CLIENT']
          }
        }
      })

      // Ensure we have an admin user
      const adminPasswordPlain = process.env.SEED_ADMIN_PASSWORD

      if (!adminPasswordPlain) {
        throw new Error(
          'SECURITY ERROR: SEED_ADMIN_PASSWORD environment variable is required!'
        )
      }

      if (adminPasswordPlain.length < 12) {
        throw new Error('SECURITY ERROR: Admin password must be at least 12 characters long!')
      }

      const adminPassword = await bcrypt.hash(adminPasswordPlain, 10)
      const admin = await tx.user.upsert({
        where: { email: 'admin@agentpro.com' },
        update: {
          password: adminPassword,
          name: 'מנהל ראשי',
          role: 'ADMIN',
          phone: '050-0000000',
        },
        create: {
          email: 'admin@agentpro.com',
          password: adminPassword,
          name: 'מנהל ראשי',
          role: 'ADMIN',
          phone: '050-0000000',
        },
      })

      // Get final counts
      const userCount = await tx.user.count()
      const folderCount = await tx.folder.count()
      const fileCount = await tx.file.count()

      return {
        deleted: {
          files: deletedFiles.count,
          folders: deletedFolders.count,
          notifications: deletedNotifications.count,
          activities: deletedActivities.count,
          logs: deletedLogs.count,
          users: deletedUsers.count,
        },
        remaining: {
          users: userCount,
          folders: folderCount,
          files: fileCount,
        },
        admin: {
          email: admin.email,
          name: admin.name,
        }
      }
    })

    console.log('✅ System reset completed successfully')
    console.log('Deleted:', result.deleted)
    console.log('Remaining:', result.remaining)

    return NextResponse.json({
      success: true,
      message: 'System reset completed successfully',
      data: result,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('❌ System reset failed:', error)

    return NextResponse.json(
      {
        error: 'System reset failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/reset-system
 *
 * Returns information about what will be deleted
 */
export async function GET() {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    // Get current counts
    const stats = {
      users: {
        total: await prisma.user.count(),
        admins: await prisma.user.count({ where: { role: 'ADMIN' } }),
        agents: await prisma.user.count({ where: { role: 'AGENT' } }),
        clients: await prisma.user.count({ where: { role: 'CLIENT' } }),
      },
      folders: await prisma.folder.count(),
      files: await prisma.file.count(),
      notifications: await prisma.notification.count(),
      activities: await prisma.activity.count(),
      logs: await prisma.log.count(),
    }

    const willDelete = {
      agents: stats.users.agents,
      clients: stats.users.clients,
      folders: stats.folders,
      files: stats.files,
      notifications: stats.notifications,
      activities: stats.activities,
      logs: stats.logs,
    }

    const willKeep = {
      admins: stats.users.admins,
    }

    return NextResponse.json({
      currentStats: stats,
      willDelete,
      willKeep,
      warning: 'This operation cannot be undone. Make sure you have a backup!',
      toConfirm: 'Send POST request with { "confirm": "RESET_PRODUCTION_DATA" }',
    })

  } catch (error) {
    console.error('Failed to get system stats:', error)

    return NextResponse.json(
      { error: 'Failed to get system stats' },
      { status: 500 }
    )
  }
}
