import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import nodemailer from 'nodemailer';

const EMAIL_USER = process.env.GMAIL_USER || 'orenshp77@gmail.com';
const EMAIL_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';
const ALERT_EMAIL = 'orenshp77@gmail.com';
const SITE_URL = process.env.NEXTAUTH_URL || 'https://insurance-app-76715104388s.me-west1.run.app';

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD
  }
});

export async function GET() {
  console.log('🤖 Monitoring bot started at:', new Date().toISOString());

  const results = {
    timestamp: new Date().toISOString(),
    siteHealth: { ok: true, message: 'Site is running' },
    dbHealth: { ok: false, message: '' },
    errors: [] as any[],
    emailSent: false,
    alerts: [] as string[]
  };

  try {
    // 1. Check database health
    results.dbHealth = await checkDatabaseHealth();

    // 2. Check for errors in last 24 hours
    results.errors = await checkErrorLogs();

    // 3. Determine if there are issues
    const hasIssues = !results.dbHealth.ok || results.errors.length > 0;

    // 4. Send appropriate email
    if (hasIssues) {
      await sendAlertEmail(results);
      results.emailSent = true;
      results.alerts.push('Alert email sent due to issues');
    } else {
      // Check if we should send 3-day status email
      const shouldSendStatus = await shouldSendStatusEmail();
      if (shouldSendStatus) {
        await sendStatusEmail(results);
        results.emailSent = true;
        results.alerts.push('Status email sent (every 3 days)');
      }
    }

    console.log('✅ Monitoring completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Monitoring completed',
      results
    });

  } catch (error) {
    console.error('❌ Monitoring bot error:', error);

    // Try to send critical error email
    try {
      await sendCriticalErrorEmail(error);
    } catch (emailError) {
      console.error('Failed to send error email:', emailError);
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 });
  }
}

async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      ok: true,
      message: 'Database connection is healthy'
    };
  } catch (error) {
    return {
      ok: false,
      message: `Database error: ${error instanceof Error ? error.message : 'Unknown'}`
    };
  }
}

async function checkErrorLogs() {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const errors = await prisma.log.findMany({
      where: {
        errorLevel: {
          in: ['ERROR', 'CRITICAL']
        },
        createdAt: {
          gte: yesterday
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    return errors.map(err => ({
      id: err.id,
      message: err.message,
      errorLevel: err.errorLevel,
      createdAt: err.createdAt
    }));
  } catch (error) {
    console.error('Error checking logs:', error);
    return [];
  }
}

async function shouldSendStatusEmail(): Promise<boolean> {
  try {
    // Check if there's a log entry for last status email
    const lastStatusLog = await prisma.log.findFirst({
      where: {
        message: 'STATUS_EMAIL_SENT',
        errorLevel: 'INFO'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!lastStatusLog) {
      // First time - send email
      await prisma.log.create({
        data: {
          message: 'STATUS_EMAIL_SENT',
          errorLevel: 'INFO'
        }
      });
      return true;
    }

    // Check if 3 days have passed
    const daysSince = (Date.now() - lastStatusLog.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince >= 3) {
      // Update timestamp
      await prisma.log.create({
        data: {
          message: 'STATUS_EMAIL_SENT',
          errorLevel: 'INFO'
        }
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking status email due:', error);
    return false;
  }
}

async function sendAlertEmail(results: any) {
  const issues: string[] = [];

  if (!results.dbHealth.ok) {
    issues.push(`⚠️ בעיה במסד הנתונים: ${results.dbHealth.message}`);
  }

  if (results.errors.length > 0) {
    issues.push(`⚠️ נמצאו ${results.errors.length} שגיאות ב-24 השעות האחרונות`);
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; direction: rtl; background-color: #f4f4f4; padding: 20px; }
        .container { background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; }
        .header { background: #dc2626; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .issue { background: #fee2e2; border-right: 4px solid #dc2626; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 התראת מערכת - מגן פנסיוני</h1>
          <p>${new Date().toLocaleString('he-IL')}</p>
        </div>

        <h2>נמצאו בעיות במערכת:</h2>

        ${issues.map(issue => `<div class="issue">${issue}</div>`).join('')}

        ${results.errors.length > 0 ? `
          <h3>שגיאות אחרונות:</h3>
          <ul>
            ${results.errors.slice(0, 5).map((err: any) => `<li>${err.message} (${err.errorLevel})</li>`).join('')}
          </ul>
        ` : ''}

        <div class="footer">
          <p>
            <strong>מערכת ניטור אוטומטית - מגן פנסיוני</strong><br>
            הודעה זו נשלחה אוטומטית על ידי בוט הניטור.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"מגן פנסיוני - ניטור" <${EMAIL_USER}>`,
    to: ALERT_EMAIL,
    subject: '🚨 התראה: בעיות במערכת מגן פנסיוני',
    html: emailHtml
  });

  console.log('📧 Alert email sent');
}

async function sendStatusEmail(results: any) {
  const emailHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; direction: rtl; background-color: #f4f4f4; padding: 20px; }
        .container { background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; }
        .header { background: #10b981; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .status-item { background: #f0fdf4; border-right: 4px solid #10b981; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ דוח סטטוס מערכת - מגן פנסיוני</h1>
          <p>${new Date().toLocaleString('he-IL')}</p>
        </div>

        <h2>המערכת פועלת תקין</h2>

        <div class="status-item">
          ✅ <strong>האתר:</strong> ${results.siteHealth.message}
        </div>

        <div class="status-item">
          ✅ <strong>מסד הנתונים:</strong> ${results.dbHealth.message}
        </div>

        <div class="status-item">
          ✅ <strong>שגיאות:</strong> לא נמצאו שגיאות ב-24 השעות האחרונות
        </div>

        <div class="footer">
          <p>
            <strong>מערכת ניטור אוטומטית - מגן פנסיוני</strong><br>
            הודעה זו נשלחת אוטומטית כל 3 ימים.<br>
            הבוט פועל כל 24 שעות ובודק את תקינות המערכת.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"מגן פנסיוני - ניטור" <${EMAIL_USER}>`,
    to: ALERT_EMAIL,
    subject: '✅ דוח סטטוס: מערכת מגן פנסיוני תקינה',
    html: emailHtml
  });

  console.log('📧 Status email sent');
}

async function sendCriticalErrorEmail(error: any) {
  const emailHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; direction: rtl; background-color: #f4f4f4; padding: 20px; }
        .container { background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; }
        .header { background: #991b1b; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .error { background: #fecaca; border-right: 4px solid #991b1b; padding: 15px; margin: 10px 0; border-radius: 5px; font-family: monospace; white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔴 שגיאה קריטית בבוט הניטור</h1>
          <p>${new Date().toLocaleString('he-IL')}</p>
        </div>

        <p>הבוט נתקל בשגיאה חמורה:</p>

        <div class="error">${error instanceof Error ? error.message : String(error)}</div>

        <p>נדרשת בדיקה מיידית!</p>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"מגן פנסיוני - ניטור" <${EMAIL_USER}>`,
    to: ALERT_EMAIL,
    subject: '🔴 שגיאה קריטית בבוט הניטור',
    html: emailHtml
  });
}
