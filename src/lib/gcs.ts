import { Storage } from '@google-cloud/storage'

// Initialize GCS client
// On Cloud Run, this will automatically use the service account credentials
const storage = new Storage()

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'insurance-app-uploads'

export async function uploadToGCS(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const bucket = storage.bucket(BUCKET_NAME)
  const blob = bucket.file(fileName)

  // Upload the file
  await blob.save(file, {
    contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000', // Cache for 1 year
    },
  })

  // Make the file publicly accessible
  await blob.makePublic()

  // Return the public URL
  return `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`
}

export async function deleteFromGCS(fileName: string): Promise<void> {
  try {
    const bucket = storage.bucket(BUCKET_NAME)
    await bucket.file(fileName).delete()
  } catch (error) {
    console.error('Error deleting file from GCS:', error)
    // Don't throw - file might not exist
  }
}

// Extract filename from GCS URL
export function getFileNameFromUrl(url: string): string | null {
  if (!url.includes('storage.googleapis.com')) {
    return null
  }
  const parts = url.split('/')
  return parts[parts.length - 1]
}
