/**
 * Auto-Healer Bot for insurance-app
 *
 * רץ כל 3 ימים:
 * 1. סורק את המערכת לבעיות
 * 2. מתקן באגים אוטומטית
 * 3. שולח דוח למייל
 */

import { PrismaClient } from '@prisma/client'
import nodemailer from 'nodemailer'

const prisma = new PrismaClient()

interface Issue {
  severity: 'critical' | 'warning' | 'info'
  category: string
  description: string
  location: string
  autoFixable: boolean
  fixed: boolean
}

interface HealthReport {
  timestamp: string
  status: 'healthy' | 'issues_found' | 'critical'
  issuesFound: Issue[]
  issuesFixed: Issue[]
  manualActionRequired: Issue[]
  stats: {
    totalChecks: number
    issuesFound: number
    issuesFixed: number
    manualRequired: number
  }
}

/**
 * Main entry point - Cloud Function
 */
export async function autoHealerBot(req: any, res: any) {
  console.log('🤖 Auto-Healer Bot started...')

  try {
    const report: HealthReport = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      issuesFound: [],
      issuesFixed: [],
      manualActionRequired: [],
      stats: {
        totalChecks: 0,
        issuesFound: 0,
        issuesFixed: 0,
        manualRequired: 0,
      }
    }

    // Run all health checks
    await checkDatabaseHealth(report)
    await checkOrphanedRecords(report)
    await checkFileIntegrity(report)
    await checkUserAccounts(report)
    await checkSystemLogs(report)
    await checkPerformance(report)
    await checkSecurity(report)

    // Update status based on findings
    if (report.issuesFound.some(i => i.severity === 'critical')) {
      report.status = 'critical'
    } else if (report.issuesFound.length > 0) {
      report.status = 'issues_found'
    }

    // Update stats
    report.stats.totalChecks = 7
    report.stats.issuesFound = report.issuesFound.length
    report.stats.issuesFixed = report.issuesFixed.length
    report.stats.manualRequired = report.manualActionRequired.length

    // Send email report
    await sendEmailReport(report)

    console.log('✅ Auto-Healer Bot completed')

    res.status(200).json({
      success: true,
      report
    })

  } catch (error) {
    console.error('❌ Auto-Healer Bot failed:', error)

    // Send error notification
    await sendErrorNotification(error)

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Check 1: Database Health
 */
async function checkDatabaseHealth(report: HealthReport) {
  console.log('🔍 Checking database health...')

  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`

    // Check for connection pool issues
    const activeConnections = await prisma.$queryRaw<any[]>`
      SELECT count(*) as count FROM information_schema.processlist
    `

    const connectionCount = activeConnections[0]?.count || 0

    if (connectionCount > 50) {
      report.issuesFound.push({
        severity: 'warning',
        category: 'Database',
        description: `גם רב חיבורים פעילים: ${connectionCount}`,
        location: 'Database Connection Pool',
        autoFixable: false,
        fixed: false
      })
      report.manualActionRequired.push(report.issuesFound[report.issuesFound.length - 1])
    }

    // Check table sizes
    const tableSizes = await prisma.$queryRaw<any[]>`
      SELECT
        table_name,
        ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
      FROM information_schema.TABLES
      WHERE table_schema = DATABASE()
      ORDER BY size_mb DESC
    `

    for (const table of tableSizes) {
      if (table.size_mb > 1000) {
        report.issuesFound.push({
          severity: 'warning',
          category: 'Database',
          description: `טבלה ${table.table_name} גדולה מדי: ${table.size_mb}MB`,
          location: `Table: ${table.table_name}`,
          autoFixable: false,
          fixed: false
        })
      }
    }

  } catch (error) {
    report.issuesFound.push({
      severity: 'critical',
      category: 'Database',
      description: 'שגיאה בחיבור לדאטהבייס',
      location: 'Database Connection',
      autoFixable: false,
      fixed: false
    })
    report.manualActionRequired.push(report.issuesFound[report.issuesFound.length - 1])
  }
}

/**
 * Check 2: Orphaned Records
 */
async function checkOrphanedRecords(report: HealthReport) {
  console.log('🔍 Checking for orphaned records...')

  try {
    // Find orphaned clients (agent deleted)
    const orphanedClients = await prisma.user.findMany({
      where: {
        role: 'CLIENT',
        agentId: {
          not: null
        },
        agent: null
      }
    })

    if (orphanedClients.length > 0) {
      const issue: Issue = {
        severity: 'warning',
        category: 'Data Integrity',
        description: `נמצאו ${orphanedClients.length} לקוחות יתומים (הסוכן נמחק)`,
        location: 'User table',
        autoFixable: true,
        fixed: false
      }

      report.issuesFound.push(issue)

      // Auto-fix: Set agentId to null and mark with formerAgentName
      try {
        for (const client of orphanedClients) {
          await prisma.user.update({
            where: { id: client.id },
            data: {
              agentId: null,
              formerAgentName: client.agentId ? `Agent ID: ${client.agentId}` : null
            }
          })
        }

        issue.fixed = true
        report.issuesFixed.push(issue)
        console.log(`✅ Fixed ${orphanedClients.length} orphaned clients`)
      } catch (fixError) {
        report.manualActionRequired.push(issue)
      }
    }

    // Find orphaned folders (user deleted)
    const orphanedFolders = await prisma.folder.findMany({
      where: {
        userId: null
      }
    })

    if (orphanedFolders.length > 0) {
      const issue: Issue = {
        severity: 'warning',
        category: 'Data Integrity',
        description: `נמצאו ${orphanedFolders.length} תיקיות יתומות`,
        location: 'Folder table',
        autoFixable: true,
        fixed: false
      }

      report.issuesFound.push(issue)

      // Auto-fix: Delete orphaned folders
      try {
        await prisma.folder.deleteMany({
          where: {
            id: {
              in: orphanedFolders.map(f => f.id)
            }
          }
        })

        issue.fixed = true
        report.issuesFixed.push(issue)
        console.log(`✅ Deleted ${orphanedFolders.length} orphaned folders`)
      } catch (fixError) {
        report.manualActionRequired.push(issue)
      }
    }

    // Find orphaned files (folder deleted)
    const orphanedFiles = await prisma.file.findMany({
      where: {
        folder: null
      }
    })

    if (orphanedFiles.length > 0) {
      const issue: Issue = {
        severity: 'warning',
        category: 'Data Integrity',
        description: `נמצאו ${orphanedFiles.length} קבצים יתומים`,
        location: 'File table',
        autoFixable: true,
        fixed: false
      }

      report.issuesFound.push(issue)

      // Auto-fix: Delete orphaned files
      try {
        await prisma.file.deleteMany({
          where: {
            id: {
              in: orphanedFiles.map(f => f.id)
            }
          }
        })

        issue.fixed = true
        report.issuesFixed.push(issue)
        console.log(`✅ Deleted ${orphanedFiles.length} orphaned files`)
      } catch (fixError) {
        report.manualActionRequired.push(issue)
      }
    }

  } catch (error) {
    console.error('Error checking orphaned records:', error)
  }
}

/**
 * Check 3: File Integrity
 */
async function checkFileIntegrity(report: HealthReport) {
  console.log('🔍 Checking file integrity...')

  try {
    // Check for duplicate file URLs
    const duplicateFiles = await prisma.$queryRaw<any[]>`
      SELECT url, COUNT(*) as count
      FROM File
      GROUP BY url
      HAVING count > 1
    `

    if (duplicateFiles.length > 0) {
      report.issuesFound.push({
        severity: 'info',
        category: 'File System',
        description: `נמצאו ${duplicateFiles.length} קבצים כפולים`,
        location: 'File table',
        autoFixable: false,
        fixed: false
      })
    }

    // Check for files with invalid URLs
    const invalidFiles = await prisma.file.findMany({
      where: {
        OR: [
          { url: '' },
          { url: null as any },
          { fileName: '' },
          { fileName: null as any }
        ]
      }
    })

    if (invalidFiles.length > 0) {
      const issue: Issue = {
        severity: 'warning',
        category: 'File System',
        description: `נמצאו ${invalidFiles.length} קבצים עם נתונים לא תקינים`,
        location: 'File table',
        autoFixable: true,
        fixed: false
      }

      report.issuesFound.push(issue)

      // Auto-fix: Delete invalid files
      try {
        await prisma.file.deleteMany({
          where: {
            id: {
              in: invalidFiles.map(f => f.id)
            }
          }
        })

        issue.fixed = true
        report.issuesFixed.push(issue)
      } catch (fixError) {
        report.manualActionRequired.push(issue)
      }
    }

  } catch (error) {
    console.error('Error checking file integrity:', error)
  }
}

/**
 * Check 4: User Accounts
 */
async function checkUserAccounts(report: HealthReport) {
  console.log('🔍 Checking user accounts...')

  try {
    // Check for users without email
    const usersWithoutEmail = await prisma.user.count({
      where: {
        OR: [
          { email: '' },
          { email: null as any }
        ]
      }
    })

    if (usersWithoutEmail > 0) {
      report.issuesFound.push({
        severity: 'critical',
        category: 'User Management',
        description: `נמצאו ${usersWithoutEmail} משתמשים ללא מייל`,
        location: 'User table',
        autoFixable: false,
        fixed: false
      })
      report.manualActionRequired.push(report.issuesFound[report.issuesFound.length - 1])
    }

    // Check for duplicate emails
    const duplicateEmails = await prisma.$queryRaw<any[]>`
      SELECT email, COUNT(*) as count
      FROM User
      GROUP BY email
      HAVING count > 1
    `

    if (duplicateEmails.length > 0) {
      report.issuesFound.push({
        severity: 'critical',
        category: 'User Management',
        description: `נמצאו ${duplicateEmails.length} כתובות מייל כפולות`,
        location: 'User table',
        autoFixable: false,
        fixed: false
      })
      report.manualActionRequired.push(report.issuesFound[report.issuesFound.length - 1])
    }

    // Check for old notifications (>30 days)
    const oldNotifications = await prisma.notification.count({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        isRead: true
      }
    })

    if (oldNotifications > 100) {
      const issue: Issue = {
        severity: 'info',
        category: 'Data Cleanup',
        description: `נמצאו ${oldNotifications} התראות ישנות (>30 יום)`,
        location: 'Notification table',
        autoFixable: true,
        fixed: false
      }

      report.issuesFound.push(issue)

      // Auto-fix: Delete old read notifications
      try {
        await prisma.notification.deleteMany({
          where: {
            createdAt: {
              lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            },
            isRead: true
          }
        })

        issue.fixed = true
        report.issuesFixed.push(issue)
      } catch (fixError) {
        report.manualActionRequired.push(issue)
      }
    }

  } catch (error) {
    console.error('Error checking user accounts:', error)
  }
}

/**
 * Check 5: System Logs
 */
async function checkSystemLogs(report: HealthReport) {
  console.log('🔍 Checking system logs...')

  try {
    // Check for critical errors in the last 3 days
    const criticalErrors = await prisma.log.count({
      where: {
        errorLevel: 'CRITICAL',
        createdAt: {
          gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }
      }
    })

    if (criticalErrors > 0) {
      report.issuesFound.push({
        severity: 'critical',
        category: 'System Logs',
        description: `נמצאו ${criticalErrors} שגיאות קריטיות ב-3 הימים האחרונים`,
        location: 'Log table',
        autoFixable: false,
        fixed: false
      })
      report.manualActionRequired.push(report.issuesFound[report.issuesFound.length - 1])
    }

    // Clean old logs (>90 days)
    const oldLogs = await prisma.log.count({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      }
    })

    if (oldLogs > 1000) {
      const issue: Issue = {
        severity: 'info',
        category: 'Data Cleanup',
        description: `נמצאו ${oldLogs} לוגים ישנים (>90 יום)`,
        location: 'Log table',
        autoFixable: true,
        fixed: false
      }

      report.issuesFound.push(issue)

      // Auto-fix: Delete old logs
      try {
        await prisma.log.deleteMany({
          where: {
            createdAt: {
              lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
            }
          }
        })

        issue.fixed = true
        report.issuesFixed.push(issue)
      } catch (fixError) {
        report.manualActionRequired.push(issue)
      }
    }

  } catch (error) {
    console.error('Error checking system logs:', error)
  }
}

/**
 * Check 6: Performance
 */
async function checkPerformance(report: HealthReport) {
  console.log('🔍 Checking performance...')

  try {
    // Check database query performance
    const slowQueries = await prisma.$queryRaw<any[]>`
      SELECT * FROM information_schema.processlist
      WHERE command != 'Sleep' AND time > 5
    `

    if (slowQueries.length > 0) {
      report.issuesFound.push({
        severity: 'warning',
        category: 'Performance',
        description: `נמצאו ${slowQueries.length} שאילתות איטיות (>5 שניות)`,
        location: 'Database',
        autoFixable: false,
        fixed: false
      })
      report.manualActionRequired.push(report.issuesFound[report.issuesFound.length - 1])
    }

  } catch (error) {
    console.error('Error checking performance:', error)
  }
}

/**
 * Check 7: Security
 */
async function checkSecurity(report: HealthReport) {
  console.log('🔍 Checking security...')

  try {
    // Check for admin users
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    })

    if (adminCount === 0) {
      report.issuesFound.push({
        severity: 'critical',
        category: 'Security',
        description: 'אין משתמשי Admin במערכת!',
        location: 'User table',
        autoFixable: false,
        fixed: false
      })
      report.manualActionRequired.push(report.issuesFound[report.issuesFound.length - 1])
    } else if (adminCount > 5) {
      report.issuesFound.push({
        severity: 'warning',
        category: 'Security',
        description: `יותר מדי משתמשי Admin: ${adminCount}`,
        location: 'User table',
        autoFixable: false,
        fixed: false
      })
    }

  } catch (error) {
    console.error('Error checking security:', error)
  }
}

/**
 * Send email report to admin
 */
async function sendEmailReport(report: HealthReport) {
  console.log('📧 Sending email report...')

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  })

  const statusEmoji = report.status === 'healthy' ? '✅' :
                     report.status === 'issues_found' ? '⚠️' : '🚨'

  const emailBody = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; direction: rtl; background: #f5f5f5; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; margin-bottom: 30px; }
        .status { font-size: 48px; margin: 10px 0; }
        .section { margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border-right: 4px solid #667eea; }
        .section h3 { color: #333; margin-top: 0; }
        .issue { padding: 15px; margin: 10px 0; border-radius: 6px; border-right: 4px solid; }
        .critical { background: #fee; border-right-color: #dc3545; }
        .warning { background: #fff3cd; border-right-color: #ffc107; }
        .info { background: #e7f3ff; border-right-color: #0dcaf0; }
        .fixed { background: #d4edda; border-right-color: #28a745; }
        .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-number { font-size: 36px; font-weight: bold; color: #667eea; }
        .stat-label { color: #666; margin-top: 5px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="status">${statusEmoji}</div>
          <h1>דוח סריקה אוטומטית - insurance-app</h1>
          <p>${new Date(report.timestamp).toLocaleString('he-IL')}</p>
        </div>

        <div class="section">
          <h3>📊 סיכום</h3>
          <div class="stats">
            <div class="stat-card">
              <div class="stat-number">${report.stats.totalChecks}</div>
              <div class="stat-label">בדיקות שבוצעו</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${report.stats.issuesFound}</div>
              <div class="stat-label">בעיות שנמצאו</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${report.stats.issuesFixed}</div>
              <div class="stat-label">תוקנו אוטומטית</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${report.stats.manualRequired}</div>
              <div class="stat-label">דורשות טיפול ידני</div>
            </div>
          </div>
        </div>

        ${report.issuesFixed.length > 0 ? `
        <div class="section">
          <h3>✅ תוקן אוטומטית:</h3>
          ${report.issuesFixed.map(issue => `
            <div class="issue fixed">
              <strong>${issue.category}:</strong> ${issue.description}
              <br><small>📍 ${issue.location}</small>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${report.manualActionRequired.length > 0 ? `
        <div class="section">
          <h3>⚠️ דורש טיפול ידני:</h3>
          ${report.manualActionRequired.map(issue => `
            <div class="issue ${issue.severity}">
              <strong>${issue.category}:</strong> ${issue.description}
              <br><small>📍 ${issue.location}</small>
              <br><small>🔴 רמת חומרה: ${issue.severity}</small>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${report.status === 'healthy' ? `
        <div class="section">
          <h3 style="color: #28a745;">🎉 כרגע הכל תקין!</h3>
          <p>לא נמצאו בעיות במערכת. המערכת פועלת כשורה.</p>
        </div>
        ` : ''}

        <div class="footer">
          <p><strong>🤖 Auto-Healer Bot</strong> | insurance-app</p>
          <p style="font-size: 12px;">דוח זה נוצר אוטומטית ונשלח כל 3 ימים</p>
        </div>
      </div>
    </body>
    </html>
  `

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: 'orenshp77@gmail.com',
    subject: `${statusEmoji} דוח סריקה אוטומטית - insurance-app - ${new Date().toLocaleDateString('he-IL')}`,
    html: emailBody
  })

  console.log('✅ Email sent successfully')
}

/**
 * Send error notification
 */
async function sendErrorNotification(error: any) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    })

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: 'orenshp77@gmail.com',
      subject: '🚨 Auto-Healer Bot - שגיאה קריטית',
      html: `
        <div dir="rtl" style="font-family: Arial; padding: 20px;">
          <h2 style="color: #dc3545;">🚨 Auto-Healer Bot נכשל!</h2>
          <p>הבוט נתקל בשגיאה במהלך הסריקה:</p>
          <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${error}</pre>
          <p>נא לבדוק את הלוגים ב-Google Cloud Console.</p>
        </div>
      `
    })
  } catch (emailError) {
    console.error('Failed to send error notification:', emailError)
  }
}

// Export for Cloud Functions
export { autoHealerBot as default }
