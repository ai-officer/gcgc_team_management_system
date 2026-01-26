import OSS from 'ali-oss'

// OSS client singleton
let ossClient: OSS | null = null

export function getOSSClient(): OSS {
  if (!ossClient) {
    const region = process.env.OSS_REGION
    const accessKeyId = process.env.OSS_ACCESS_KEY_ID
    const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET
    const bucket = process.env.OSS_BUCKET

    if (!region || !accessKeyId || !accessKeySecret || !bucket) {
      throw new Error('Missing OSS configuration. Please set OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, and OSS_BUCKET environment variables.')
    }

    ossClient = new OSS({
      region,
      accessKeyId,
      accessKeySecret,
      bucket,
      // Use internal endpoint when running on Alibaba Cloud ECS in the same region
      internal: process.env.OSS_USE_INTERNAL === 'true',
    })
  }

  return ossClient
}

// Generate a public URL for an OSS object
export function getOSSUrl(objectKey: string): string {
  const bucket = process.env.OSS_BUCKET
  const region = process.env.OSS_REGION

  // Return the public URL
  return `https://${bucket}.${region}.aliyuncs.com/${objectKey}`
}

// Upload a file to OSS
export async function uploadToOSS(
  buffer: Buffer,
  objectKey: string,
  contentType: string
): Promise<{ url: string; objectKey: string }> {
  const client = getOSSClient()

  await client.put(objectKey, buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000', // 1 year cache
    },
  })

  const url = getOSSUrl(objectKey)
  return { url, objectKey }
}

// Delete a file from OSS
export async function deleteFromOSS(objectKey: string): Promise<void> {
  const client = getOSSClient()

  try {
    await client.delete(objectKey)
  } catch (error) {
    console.error('Error deleting from OSS:', error)
    // Don't throw - cleanup failures shouldn't break the main flow
  }
}

// Extract object key from OSS URL (handles URLs with query parameters)
export function getObjectKeyFromUrl(url: string): string | null {
  const bucket = process.env.OSS_BUCKET
  const region = process.env.OSS_REGION

  const prefix = `https://${bucket}.${region}.aliyuncs.com/`

  if (url.startsWith(prefix)) {
    // Remove query parameters if present (e.g., ?v=timestamp)
    const urlWithoutQuery = url.split('?')[0]
    return urlWithoutQuery.substring(prefix.length)
  }

  return null
}
