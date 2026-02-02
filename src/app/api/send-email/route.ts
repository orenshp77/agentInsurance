import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// POST - Send email notification
export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }

    // Only agents and admins can send emails
    if (session.user.role !== 'AGENT' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
    }

    const { to, subject, text, html } = await req.json()

    if (!to || !subject || (!text && !html)) {
      return NextResponse.json(
        { error: 'חסרים שדות חובה (to, subject, text/html)' },
        { status: 400 }
      )
    }

    // TODO: Add your email service configuration here
    // Example with nodemailer:
    //
    // import nodemailer from 'nodemailer'
    //
    // const transporter = nodemailer.createTransport({
    //   host: process.env.SMTP_HOST,
    //   port: Number(process.env.SMTP_PORT),
    //   secure: true,
    //   auth: {
    //     user: process.env.SMTP_USER,
    //     pass: process.env.SMTP_PASS,
    //   },
    // })
    //
    // await transporter.sendMail({
    //   from: process.env.SMTP_FROM || '"מגן פיננסי" <noreply@example.com>',
    //   to,
    //   subject,
    //   text,
    //   html,
    // })

    // For now, log the email (remove this in production)
    console.log('📧 Email would be sent:', {
      to,
      subject,
      text: text?.substring(0, 100) + '...',
      timestamp: new Date().toISOString(),
    })

    // Return success (even without actual email sending for development)
    return NextResponse.json({
      success: true,
      message: 'Email logged (SMTP not configured yet)',
      details: {
        to,
        subject,
        sentAt: new Date().toISOString(),
      }
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'שגיאה בשליחת המייל' },
      { status: 500 }
    )
  }
}
