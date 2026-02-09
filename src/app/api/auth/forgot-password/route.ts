import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { resetPasswordEmail } from '@/lib/email-templates';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'אנא הזן כתובת מייל' },
        { status: 400 }
      );
    }

    // בדיקה שהמשתמש קיים (סוכן או לקוח)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // תמיד נחזיר הודעת הצלחה (אבטחה - לא נגלה אם המייל קיים)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'אם המייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה',
      });
    }

    // יצירת טוקן ייחודי
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // תוקף של שעה

    // מחיקת טוקנים ישנים של המשתמש
    await prisma.passwordResetToken.deleteMany({
      where: { email },
    });

    // שמירת הטוקן החדש
    await prisma.passwordResetToken.create({
      data: {
        email,
        token: resetToken,
        expiresAt,
      },
    });

    // שליחת מייל
    const emailHtml = resetPasswordEmail(user.name, resetToken);
    await sendEmail({
      to: email,
      subject: 'איפוס סיסמה - Insurance App',
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      message: 'אם המייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה',
    });
  } catch (error) {
    console.error('שגיאה בבקשת איפוס סיסמה:', error);
    return NextResponse.json(
      { error: 'אירעה שגיאה, אנא נסה שוב מאוחר יותר' },
      { status: 500 }
    );
  }
}
