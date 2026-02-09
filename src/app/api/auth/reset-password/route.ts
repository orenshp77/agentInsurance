import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { passwordResetSuccessEmail } from '@/lib/email-templates';
import { validatePassword } from '@/lib/password-validator';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'נתונים חסרים' },
        { status: 400 }
      );
    }

    // SECURITY: Validate password strength (12+ chars, uppercase, lowercase, numbers, special chars)
    const validation = validatePassword(password);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.errors.join('. ') },
        { status: 400 }
      );
    }

    // בדיקת הטוקן
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: 'הקישור לא תקף' },
        { status: 400 }
      );
    }

    // בדיקה שהטוקן לא פג תוקף
    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json(
        { error: 'הקישור פג תוקף, אנא בקש קישור חדש' },
        { status: 400 }
      );
    }

    // בדיקה שהטוקן לא שומש
    if (resetToken.used) {
      return NextResponse.json(
        { error: 'הקישור כבר שומש' },
        { status: 400 }
      );
    }

    // מציאת המשתמש
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'משתמש לא נמצא' },
        { status: 404 }
      );
    }

    // החשת הסיסמה
    const hashedPassword = await bcrypt.hash(password, 10);

    // עדכון הסיסמה
    await prisma.user.update({
      where: { email: resetToken.email },
      data: { password: hashedPassword },
    });

    // סימון הטוקן כמשומש
    await prisma.passwordResetToken.update({
      where: { token },
      data: { used: true },
    });

    // שליחת מייל אישור
    const emailHtml = passwordResetSuccessEmail(user.name);
    await sendEmail({
      to: user.email,
      subject: 'הסיסמה שונתה בהצלחה - Insurance App',
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      message: 'הסיסמה שונתה בהצלחה!',
    });
  } catch (error) {
    console.error('שגיאה באיפוס סיסמה:', error);
    return NextResponse.json(
      { error: 'אירעה שגיאה, אנא נסה שוב מאוחר יותר' },
      { status: 500 }
    );
  }
}
