import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, phone, idNumber, agentId, role, logoUrl } = body

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'שם, אימייל וסיסמה הם שדות חובה' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'משתמש עם אימייל זה כבר קיים במערכת' },
        { status: 400 }
      )
    }

    // Verify agent exists if agentId provided
    if (agentId) {
      const agent = await prisma.user.findUnique({
        where: { id: agentId },
      })

      if (!agent || (agent.role !== 'AGENT' && agent.role !== 'ADMIN')) {
        return NextResponse.json(
          { error: 'הסוכן לא נמצא' },
          { status: 400 }
        )
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        idNumber: idNumber || null,
        role: role || 'CLIENT',
        agentId: agentId || null,
        logoUrl: logoUrl || null,
      },
    })

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      message: 'המשתמש נוצר בהצלחה',
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'שגיאה ביצירת המשתמש' },
      { status: 500 }
    )
  }
}
