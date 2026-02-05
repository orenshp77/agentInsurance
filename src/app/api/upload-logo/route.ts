import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadToGCS } from '@/lib/gcs'

const MAX_FILE_SIZE_MB = 5 // 5MB limit for logos
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const targetUserId = formData.get('userId') as string | null

    // Determine which user to update
    let userIdToUpdate = session.user.id

    // Allow admin to update another user's logo
    if (targetUserId && session.user.role === 'ADMIN') {
      userIdToUpdate = targetUserId
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `הקובץ גדול מדי. הגודל המקסימלי הוא ${MAX_FILE_SIZE_MB}MB` },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PNG, JPG, GIF, and WebP images are allowed' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const ext = path.extname(file.name) || '.png'
    const fileName = `logos/logo-${timestamp}-${Math.random().toString(36).substring(7)}${ext}`

    // Convert file to buffer and upload to GCS
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    console.log('Uploading logo to GCS:', fileName)
    const url = await uploadToGCS(buffer, fileName, file.type)
    console.log('Logo uploaded successfully:', url)

    // Update user's logoUrl in database
    await prisma.user.update({
      where: { id: userIdToUpdate },
      data: { logoUrl: url },
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Error uploading logo:', error)
    return NextResponse.json(
      { error: 'Failed to upload logo' },
      { status: 500 }
    )
  }
}
