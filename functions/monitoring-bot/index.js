const functions = require('@google-cloud/functions-framework');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');
const { Storage } = require('@google-cloud/storage');

// Gmail configuration
const EMAIL_USER = 'orenshp77@gmail.com';
const EMAIL_PASSWORD = 'omegoytwqxuzdoid';
const ALERT_EMAIL = 'orenshp77@gmail.com';

// Site configuration
const SITE_URL = 'https://insurance-app-76715104388s.me-west1.run.app';
const PROJECT_ID = 'insurance-app-486316';
const DB_INSTANCE = 'insurance-db';

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD
  }
});

// Storage client for backups
const storage = new Storage();
const BACKUP_BUCKET = 'insurance-app-backups';

/**
 * Main monitoring function - runs every 24 hours
 */
functions.http('monitoring-bot', async (req, res) => {
  console.log('🤖 Monitoring bot started at:', new Date().toISOString());

  const results = {
    timestamp: new Date().toISOString(),
    siteHealth: null,
    dbHealth: null,
    errors: [],
    backupStatus: null,
    alerts: []
  };

  try {
    // 1. Check site health
    results.siteHealth = await checkSiteHealth();

    // 2. Check database health
    results.dbHealth = await checkDatabaseHealth();

    // 3. Check for errors in logs
    results.errors = await checkErrorLogs();

    // 4. Perform database backup
    results.backupStatus = await performDatabaseBackup();

    // 5. Check if 3 days have passed for status email
    const shouldSendStatusEmail = await checkStatusEmailDue();

    // 6. Determine if alerts needed
    const hasIssues = !results.siteHealth.ok || !results.dbHealth.ok || results.errors.length > 0;

    // 7. Send appropriate email
    if (hasIssues) {
      await sendAlertEmail(results);
      results.alerts.push('Alert email sent due to issues detected');
    } else if (shouldSendStatusEmail) {
      await sendStatusEmail(results);
      results.alerts.push('3-day status email sent');
    }

    console.log('✅ Monitoring completed successfully:', results);

    res.status(200).json({
      success: true,
      message: 'Monitoring completed',
      results
    });

  } catch (error) {
    console.error('❌ Monitoring bot error:', error);

    // Send critical error email
    await sendCriticalErrorEmail(error);

    res.status(500).json({
      success: false,
      error: error.message,
      results
    });
  }
});

/**
 * Check if site is accessible and responding
 */
async function checkSiteHealth() {
  try {
    const response = await fetch(`${SITE_URL}/api/health`, {
      method: 'GET',
      timeout: 10000
    });

    return {
      ok: response.ok,
      status: response.status,
      message: response.ok ? 'Site is healthy' : `Site returned status ${response.status}`
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: `Site check failed: ${error.message}`
    };
  }
}

/**
 * Check database connectivity
 */
async function checkDatabaseHealth() {
  try {
    const response = await fetch(`${SITE_URL}/api/health/db`, {
      method: 'GET',
      timeout: 10000
    });

    const data = await response.json();

    return {
      ok: response.ok && data.connected,
      message: data.connected ? 'Database is connected' : 'Database connection failed'
    };
  } catch (error) {
    return {
      ok: false,
      message: `Database check failed: ${error.message}`
    };
  }
}

/**
 * Check error logs from the last 24 hours
 */
async function checkErrorLogs() {
  try {
    const response = await fetch(`${SITE_URL}/api/monitoring/errors`, {
      method: 'GET',
      timeout: 10000
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.errors || [];
  } catch (error) {
    console.error('Error fetching logs:', error);
    return [];
  }
}

/**
 * Perform automated database backup
 */
async function performDatabaseBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupFileName = `backup-${timestamp}.sql`;

    // Trigger Cloud SQL export via API
    const response = await fetch(
      `https://sqladmin.googleapis.com/v1/projects/${PROJECT_ID}/instances/${DB_INSTANCE}/export`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GCLOUD_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          exportContext: {
            fileType: 'SQL',
            uri: `gs://${BACKUP_BUCKET}/${backupFileName}`,
            databases: ['agent_pro']
          }
        })
      }
    );

    if (response.ok) {
      return {
        success: true,
        fileName: backupFileName,
        message: 'Backup created successfully'
      };
    } else {
      return {
        success: false,
        message: `Backup failed: ${response.statusText}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Backup error: ${error.message}`
    };
  }
}

/**
 * Check if status email is due (every 3 days)
 */
async function checkStatusEmailDue() {
  try {
    // Check last email timestamp from storage or database
    const bucket = storage.bucket(BACKUP_BUCKET);
    const file = bucket.file('last-status-email.txt');

    const [exists] = await file.exists();

    if (!exists) {
      // First time - send email and create file
      await file.save(new Date().toISOString());
      return true;
    }

    const [contents] = await file.download();
    const lastEmailDate = new Date(contents.toString());
    const daysSince = (Date.now() - lastEmailDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince >= 3) {
      await file.save(new Date().toISOString());
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking status email due:', error);
    return false;
  }
}

/**
 * Send alert email when issues detected
 */
async function sendAlertEmail(results) {
  const issues = [];

  if (!results.siteHealth.ok) {
    issues.push(`⚠️ האתר לא מגיב: ${results.siteHealth.message}`);
  }

  if (!results.dbHealth.ok) {
    issues.push(`⚠️ בעיה בחיבור למסד הנתונים: ${results.dbHealth.message}`);
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
        .timestamp { color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 התראת מערכת - מגן פנסיוני</h1>
          <p class="timestamp">זמן: ${new Date().toLocaleString('he-IL')}</p>
        </div>

        <h2>נמצאו בעיות במערכת:</h2>

        ${issues.map(issue => `<div class="issue">${issue}</div>`).join('')}

        ${results.errors.length > 0 ? `
          <h3>שגיאות אחרונות:</h3>
          <ul>
            ${results.errors.slice(0, 5).map(err => `<li>${err.message} (${err.errorLevel})</li>`).join('')}
          </ul>
        ` : ''}

        <div class="footer">
          <p>
            <strong>מערכת ניטור אוטומטית - מגן פנסיוני</strong><br>
            הודעה זו נשלחה אוטומטית על ידי בוט הניטור.<br>
            אנא בדוק את המערכת בהקדם האפשרי.
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

  console.log('📧 Alert email sent successfully');
}

/**
 * Send status email (every 3 days)
 */
async function sendStatusEmail(results) {
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
        .timestamp { color: white; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ דוח סטטוס מערכת - מגן פנסיוני</h1>
          <p class="timestamp">זמן: ${new Date().toLocaleString('he-IL')}</p>
        </div>

        <h2>המערכת פועלת תקין</h2>

        <div class="status-item">
          ✅ <strong>האתר:</strong> ${results.siteHealth.message}
        </div>

        <div class="status-item">
          ✅ <strong>מסד הנתונים:</strong> ${results.dbHealth.message}
        </div>

        <div class="status-item">
          ✅ <strong>גיבוי:</strong> ${results.backupStatus.message}
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

  console.log('📧 Status email sent successfully');
}

/**
 * Send critical error email
 */
async function sendCriticalErrorEmail(error) {
  const emailHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; direction: rtl; background-color: #f4f4f4; padding: 20px; }
        .container { background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; }
        .header { background: #991b1b; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .error { background: #fecaca; border-right: 4px solid #991b1b; padding: 15px; margin: 10px 0; border-radius: 5px; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔴 שגיאה קריטית בבוט הניטור</h1>
          <p>${new Date().toLocaleString('he-IL')}</p>
        </div>

        <p>הבוט נתקל בשגיאה חמורה:</p>

        <div class="error">
          ${error.message}<br>
          ${error.stack}
        </div>

        <p>נדרשת התערבות ידנית מיידית!</p>
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
