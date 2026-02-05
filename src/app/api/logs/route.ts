import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// POST - Create new log entry
export async function POST(req: NextRequest) {
  try {
    // Basic validation to prevent log spam
    const origin = req.headers.get('origin')
    const referer = req.headers.get('referer')
    const host = req.headers.get('host')

    // Verify request comes from our application (same origin check)
    const allowedOrigins = [
      `https://${host}`,
      `http://${host}`,
      process.env.NEXTAUTH_URL,
      'http://localhost:3000',
    ].filter(Boolean)

    const isValidOrigin = origin && allowedOrigins.some(allowed => origin.startsWith(allowed as string))
    const isValidReferer = referer && allowedOrigins.some(allowed => referer.startsWith(allowed as string))

    if (!isValidOrigin && !isValidReferer) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
    }

    const body = await req.json()
    const { message, errorLevel, stack, componentName, userId, deviceInfo, url, metadata } = body

    // Validate required fields
    if (!message || typeof message !== 'string' || message.length > 5000) {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
    }

    const validLevels = ['INFO', 'WARNING', 'ERROR', 'CRITICAL']
    if (errorLevel && !validLevels.includes(errorLevel)) {
      return NextResponse.json({ error: 'Invalid error level' }, { status: 400 })
    }

    // Generate AI fix suggestion for errors
    let aiFix: string | null = null
    if (errorLevel === 'ERROR' || errorLevel === 'CRITICAL') {
      aiFix = generateAIFix(message, stack, deviceInfo, metadata)
    }

    // Combine all metadata into one JSON string
    const fullMetadata = JSON.stringify({
      componentName,
      userId,
      deviceInfo,
      url,
      ...metadata,
    })

    const log = await prisma.log.create({
      data: {
        message,
        errorLevel: errorLevel || 'INFO',
        aiFix,
        metadata: fullMetadata,
      },
    })

    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error('Error creating log:', error)
    return NextResponse.json({ error: 'Failed to create log' }, { status: 500 })
  }
}

// GET - Fetch logs (admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    console.log('Logs API - Session:', session?.user?.email, 'Role:', session?.user?.role)

    if (!session || session.user?.role !== 'ADMIN') {
      console.log('Logs API - Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const level = searchParams.get('level')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where = level ? { errorLevel: level as 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' } : {}

    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.log.count({ where }),
    ])

    // Parse metadata for each log (with error handling for malformed JSON)
    const parsedLogs = logs.map(log => {
      let metadata = null
      if (log.metadata) {
        try {
          metadata = JSON.parse(log.metadata)
        } catch {
          // If JSON parsing fails, return the raw string
          metadata = { raw: log.metadata }
        }
      }
      return { ...log, metadata }
    })

    return NextResponse.json({ logs: parsedLogs, total })
  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}

// DELETE - Delete old logs (admin only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const daysOld = parseInt(searchParams.get('daysOld') || '30')

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const result = await prisma.log.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    return NextResponse.json({ deleted: result.count })
  } catch (error) {
    console.error('Error deleting logs:', error)
    return NextResponse.json({ error: 'Failed to delete logs' }, { status: 500 })
  }
}

// Generate AI fix suggestion
function generateAIFix(
  message: string,
  stack?: string,
  deviceInfo?: Record<string, unknown>,
  metadata?: Record<string, unknown>
): string {
  const lines = [
    '📋 העתק את הקוד הבא ושלח ל-Claude AI:',
    '',
    '---',
    '',
    `**שגיאה:** ${message}`,
    '',
  ]

  if (stack) {
    lines.push('**Stack Trace:**')
    lines.push('```')
    lines.push(stack)
    lines.push('```')
    lines.push('')
  }

  if (deviceInfo) {
    lines.push('**מידע מכשיר:**')
    lines.push(`- סוג: ${deviceInfo.deviceType || 'לא ידוע'}`)
    lines.push(`- דפדפן: ${deviceInfo.browser || 'לא ידוע'} ${deviceInfo.browserVersion || ''}`)
    lines.push(`- מערכת הפעלה: ${deviceInfo.os || 'לא ידוע'} ${deviceInfo.osVersion || ''}`)
    lines.push(`- מסך: ${deviceInfo.screenWidth || 0}x${deviceInfo.screenHeight || 0}`)
    lines.push('')
  }

  if (metadata) {
    lines.push('**מידע נוסף:**')
    lines.push('```json')
    lines.push(JSON.stringify(metadata, null, 2))
    lines.push('```')
  }

  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('בבקשה עזור לי לתקן את השגיאה הזו באפליקציית Next.js שלי.')

  return lines.join('\n')
}
