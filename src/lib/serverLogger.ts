import { prisma } from '@/lib/prisma'

export type LogCategory =
  | 'PAGE_VIEW'
  | 'USER_ACTION'
  | 'API_SUCCESS'
  | 'API_ERROR'
  | 'AUTH'
  | 'FILE_OP'
  | 'NETWORK'
  | 'BROWSER'
  | 'PERMISSION'
  | 'SYSTEM'

export interface ServerLogOptions {
  message: string
  errorLevel: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  category: LogCategory
  userId?: string
  userName?: string
  userRole?: string
  metadata?: Record<string, unknown>
  error?: Error | unknown
}

function generateServerAIFix(
  message: string,
  errorStack?: string,
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

  if (errorStack) {
    lines.push('**Stack Trace:**', '```', errorStack, '```', '')
  }

  if (metadata) {
    lines.push('**מידע נוסף:**', '```json', JSON.stringify(metadata, null, 2), '```')
  }

  lines.push('', '---', '', 'בבקשה עזור לי לתקן את השגיאה הזו באפליקציית Next.js שלי.')
  return lines.join('\n')
}

export async function serverLog(options: ServerLogOptions): Promise<void> {
  try {
    const { message, errorLevel, category, userId, userName, userRole, metadata, error } = options

    const errorStack = error instanceof Error ? error.stack : undefined
    const errorMessage = error instanceof Error ? error.message : error ? String(error) : undefined

    let aiFix: string | null = null
    if (errorLevel === 'ERROR' || errorLevel === 'CRITICAL') {
      aiFix = generateServerAIFix(message, errorStack, {
        ...metadata,
        category,
        userId,
        userName,
        userRole,
        errorMessage,
      })
    }

    const fullMetadata = JSON.stringify({
      category,
      userId,
      userName,
      userRole,
      errorStack,
      errorMessage,
      ...metadata,
    })

    await prisma.log.create({
      data: {
        message: message.substring(0, 5000),
        errorLevel,
        aiFix,
        metadata: fullMetadata,
      },
    })
  } catch (err) {
    console.error('[serverLog] Failed to write log:', err)
  }
}

export function serverLogInfo(
  message: string,
  options?: Partial<Omit<ServerLogOptions, 'message' | 'errorLevel'>>
) {
  serverLog({ message, errorLevel: 'INFO', category: options?.category || 'SYSTEM', ...options })
}

export function serverLogWarn(
  message: string,
  options?: Partial<Omit<ServerLogOptions, 'message' | 'errorLevel'>>
) {
  serverLog({ message, errorLevel: 'WARNING', category: options?.category || 'SYSTEM', ...options })
}

export function serverLogError(
  message: string,
  error?: unknown,
  options?: Partial<Omit<ServerLogOptions, 'message' | 'errorLevel' | 'error'>>
) {
  serverLog({ message, errorLevel: 'ERROR', category: options?.category || 'API_ERROR', error, ...options })
}

export function serverLogCritical(
  message: string,
  error?: unknown,
  options?: Partial<Omit<ServerLogOptions, 'message' | 'errorLevel' | 'error'>>
) {
  serverLog({ message, errorLevel: 'CRITICAL', category: options?.category || 'API_ERROR', error, ...options })
}
