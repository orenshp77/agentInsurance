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

  // Upload the file (private - NOT public)
  await blob.save(file, {
    contentType,
    metadata: {
      cacheControl: 'private, max-age=3600', // Cache for 1 hour only
    },
  })

  // SECURITY: Files are now PRIVATE - no public access
  // Return just the filename (not a URL)
  // Frontend will request a signed URL through API
  return fileName
}

// SECURITY: Generate temporary signed URL (expires after 1 hour)
export async function getSignedUrl(fileName: string): Promise<string> {
  const bucket = storage.bucket(BUCKET_NAME)
  const file = bucket.file(fileName)

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000, // 1 hour from now
  })

  return url
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
