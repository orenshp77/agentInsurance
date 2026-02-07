import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// טוען את משתני הסביבה מקובץ .env
dotenv.config();

async function testEmail() {
  try {
    console.log('🔧 יוצר את ה-transporter...');

    // יצירת transporter עם הגדרות Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    console.log('📧 שולח מייל בדיקה...');

    // שליחת מייל בדיקה
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER, // שולח לעצמו
      subject: '✅ בדיקת מייל - הכל עובד!',
      text: 'זה מייל בדיקה מהאפליקציה שלך!',
      html: '<h1>✅ הצלחה!</h1><p>המייל עובד בהצלחה! 🎉</p>',
    });

    console.log('✅ מייל נשלח בהצלחה!');
    console.log('📬 Message ID:', info.messageId);
    console.log('📨 בדוק את המייל שלך:', process.env.GMAIL_USER);
  } catch (error) {
    console.error('❌ שגיאה בשליחת המייל:');
    console.error(error);
    process.exit(1);
  }
}

testEmail();
