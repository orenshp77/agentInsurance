import nodemailer from 'nodemailer';

// יצירת transporter לשליחת מיילים
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// סוג של פרמטרים לשליחת מייל
interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * פונקציה כללית לשליחת מיילים
 */
export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.GMAIL_FROM_NAME}" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || subject,
    });

    console.log('מייל נשלח בהצלחה:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('שגיאה בשליחת מייל:', error);
    return { success: false, error };
  }
}
