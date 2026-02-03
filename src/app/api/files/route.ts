import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// GET - Get recent files
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const all = searchParams.get('all') === 'true'
    const userId = searchParams.get('userId')

    // For ADMIN - get all files from the system
    if (session.user.role === 'ADMIN' && all) {
      const files = await prisma.file.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          folder: {
            select: {
              name: true,
              category: true,
              user: {
                select: {
                  name: true,
                  role: true,
                }
              }
            }
          }
        }
      })
      return NextResponse.json(files)
    }

    // For AGENT - get files from their clients' folders
    if (session.user.role === 'AGENT') {
      // If userId is provided, get files for specific client
      if (userId) {
        // Verify the user belongs to this agent
        const client = await prisma.user.findFirst({
          where: { id: userId, agentId: session.user.id },
        })
        if (!client) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        const files = await prisma.file.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
          where: {
            folder: {
              userId: userId
            }
          },
          include: {
            folder: {
              select: {
                name: true,
                category: true,
                user: {
                  select: {
                    name: true,
                    role: true,
                  }
                }
              }
            }
          }
        })
        return NextResponse.json(files)
      }

      // Get all files for agent's clients
      const files = await prisma.file.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        where: {
          folder: {
            user: {
              agentId: session.user.id
            }
          }
        },
        include: {
          folder: {
            select: {
              name: true,
              category: true,
              user: {
                select: {
                  name: true,
                  role: true,
                }
              }
            }
          }
        }
      })
      return NextResponse.json(files)
    }

    // For CLIENT - get their own files
    const files = await prisma.file.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: {
        folder: {
          userId: session.user.id
        }
      },
      include: {
        folder: {
          select: {
            name: true,
            category: true,
          }
        }
      }
    })
    return NextResponse.json(files)
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
        user: { select: { agentId: true, name: true } },
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

    // Log the activity
    await prisma.activity.create({
      data: {
        type: 'FILE_UPLOADED',
        description: `קובץ הועלה: ${file.name} לתיקיית ${folder.name}`,
        userId: session.user.id,
        userName: session.user.name || '',
        userRole: session.user.role,
        targetId: savedFile.id,
        targetName: file.name,
        targetType: 'FILE',
      },
    })

    return NextResponse.json(savedFile, { status: 201 })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
