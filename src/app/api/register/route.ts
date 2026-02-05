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
        { error: 'אימייל זה כבר קיים במערכת' },
        { status: 400 }
      )
    }

    // Check if idNumber already exists
    if (idNumber?.trim()) {
      const existingIdNumber = await prisma.user.findUnique({
        where: { idNumber },
      })
      if (existingIdNumber) {
        return NextResponse.json(
          { error: 'תעודת זהות זו כבר קיימת במערכת' },
          { status: 400 }
        )
      }
    }

    // Check if phone already exists
    if (phone?.trim()) {
      const existingPhone = await prisma.user.findFirst({
        where: { phone },
      })
      if (existingPhone) {
        return NextResponse.json(
          { error: 'מספר טלפון זה כבר קיים במערכת' },
          { status: 400 }
        )
      }
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
  } catch (error: unknown) {
    console.error('Registration error:', error)
    // Handle Prisma unique constraint errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const meta = 'meta' in error ? error.meta as Record<string, unknown> : null
      const target = meta?.target as string[] | undefined
      if (target?.includes('email')) {
        return NextResponse.json({ error: 'אימייל זה כבר קיים במערכת' }, { status: 400 })
      }
      if (target?.includes('idNumber')) {
        return NextResponse.json({ error: 'תעודת זהות זו כבר קיימת במערכת' }, { status: 400 })
      }
      return NextResponse.json({ error: 'ערך זה כבר קיים במערכת' }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'שגיאה ביצירת המשתמש' },
      { status: 500 }
    )
  }
}
