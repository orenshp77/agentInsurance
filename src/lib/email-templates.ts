/**
 * תבנית HTML בסיסית עם עיצוב יפה
 */
function baseTemplate(content: string) {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Insurance App</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px;">
              <p style="margin: 0;">© 2026 Insurance App. כל הזכויות שמורות.</p>
              <p style="margin: 10px 0 0 0;">מייל זה נשלח אוטומטית, אנא אל תשיב למייל זה.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * מייל ברוכים הבאים למשתמש חדש
 */
export function welcomeEmail(userName: string, userType: 'agent' | 'client') {
  const typeText = userType === 'agent' ? 'סוכן' : 'לקוח';
  
  const content = `
    <h2 style="color: #333; margin-top: 0;">שלום ${userName}!</h2>
    <p style="color: #555; font-size: 16px; line-height: 1.6;">
      ברוכים הבאים ל-Insurance App! 🎉
    </p>
    <p style="color: #555; font-size: 16px; line-height: 1.6;">
      נרשמת בהצלחה כ<strong>${typeText}</strong> במערכת שלנו.
    </p>
    <p style="color: #555; font-size: 16px; line-height: 1.6;">
      עכשיו תוכל להתחבר למערכת ולהתחיל להשתמש בכל התכונות שלנו.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXTAUTH_URL}/login" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold;">התחבר למערכת</a>
    </div>
    <p style="color: #777; font-size: 14px; line-height: 1.6;">
      אם יש לך שאלות, אנחנו כאן לעזור!
    </p>
  `;
  
  return baseTemplate(content);
}

/**
 * מייל איפוס סיסמה
 */
export function resetPasswordEmail(userName: string, resetToken: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;
  
  const content = `
    <h2 style="color: #333; margin-top: 0;">שלום ${userName},</h2>
    <p style="color: #555; font-size: 16px; line-height: 1.6;">
      קיבלנו בקשה לאיפוס הסיסמה שלך. 🔒
    </p>
    <p style="color: #555; font-size: 16px; line-height: 1.6;">
      לחץ על הכפתור למטה כדי לאפס את הסיסמה שלך:
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold;">אפס סיסמה</a>
    </div>
    <p style="color: #777; font-size: 14px; line-height: 1.6;">
      או העתק את הקישור הזה לדפדפן:
    </p>
    <p style="color: #667eea; font-size: 14px; word-break: break-all;">
      ${resetUrl}
    </p>
    <div style="background-color: #fff3cd; border-right: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #856404; font-size: 14px;">
        <strong>⚠️ שים לב:</strong> הקישור תקף ל-1 שעה בלבד.
      </p>
    </div>
    <p style="color: #777; font-size: 14px; line-height: 1.6;">
      אם לא ביקשת לאפס את הסיסמה שלך, אנא התעלם ממייל זה.
    </p>
  `;
  
  return baseTemplate(content);
}

/**
 * מייל אישור איפוס סיסמה הצליח
 */
export function passwordResetSuccessEmail(userName: string) {
  const content = `
    <h2 style="color: #333; margin-top: 0;">שלום ${userName},</h2>
    <div style="text-align: center; margin: 20px 0;">
      <div style="display: inline-block; background-color: #d4edda; color: #155724; padding: 20px; border-radius: 50%; width: 60px; height: 60px; line-height: 60px; font-size: 40px;">
        ✓
      </div>
    </div>
    <p style="color: #555; font-size: 16px; line-height: 1.6; text-align: center;">
      <strong>הסיסמה שלך שונתה בהצלחה!</strong>
    </p>
    <p style="color: #555; font-size: 16px; line-height: 1.6;">
      איפוס הסיסמה הושלם בהצלחה. עכשיו תוכל להתחבר עם הסיסמה החדשה שלך.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXTAUTH_URL}/login" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold;">התחבר למערכת</a>
    </div>
    <div style="background-color: #f8d7da; border-right: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #721c24; font-size: 14px;">
        <strong>⚠️ חשוב:</strong> אם לא ביצעת שינוי זה, אנא צור איתנו קשר מיד!
      </p>
    </div>
  `;
  
  return baseTemplate(content);
}
