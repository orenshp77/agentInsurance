import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// POST - Upload file
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role === 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const folderId = formData.get('folderId') as string
    const notes = formData.get('notes') as string | null

    if (!file || !folderId) {
      return NextResponse.json(
        { error: 'File and folderId are required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF, PNG, and JPG files are allowed' },
        { status: 400 }
      )
    }

    // Check folder exists and user has permission
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        user: { select: { agentId: true } },
      },
    })

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    if (session.user.role === 'AGENT') {
      if (folder.user.agentId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    // Generate unique filename
    const timestamp = Date.now()
    const ext = path.extname(file.name)
    const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}${ext}`
    const filePath = path.join(uploadsDir, fileName)

    // Write file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Get file type
    const fileType = ext.replace('.', '').toUpperCase()

    // Save to database
    const savedFile = await prisma.file.create({
      data: {
        url: `/uploads/${fileName}`,
        fileType,
        fileName: file.name,
        notes,
        folderId,
      },
    })

    return NextResponse.json(savedFile, { status: 201 })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
