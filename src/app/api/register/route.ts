import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, phone, idNumber, agentId } = body

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

    // SECURITY: Only allow CLIENT role for self-registration
    // ADMIN and AGENT roles can only be created by authenticated admins via /api/users
    const safeRole = 'CLIENT'

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        idNumber: idNumber || null,
        role: safeRole,
        agentId: agentId || null,
        logoUrl: null, // Logos only for agents, set via admin panel
      },
    })

    // Log the registration activity
    const roleLabel = 'לקוח' // Self-registration is always CLIENT
    await prisma.activity.create({
      data: {
        type: 'USER_REGISTERED',
        description: `${roleLabel} חדש נרשם למערכת: ${name}`,
        userId: user.id,
        userName: name,
        userRole: safeRole,
        targetId: user.id,
        targetName: name,
        targetType: 'USER',
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `שגיאה ביצירת המשתמש: ${errorMessage}` },
      { status: 500 }
    )
  }
}
