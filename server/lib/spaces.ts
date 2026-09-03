import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  REPORT_PHOTO_MAX_FILE_BYTES,
  type ReportPhotoContentType,
} from '../../shared/report.ts'
import { env, isSpacesConfigured } from '../config/env.ts'

export { isSpacesConfigured }

let client: S3Client | null = null

function spacesClient() {
  if (!isSpacesConfigured || !env.spacesKey || !env.spacesSecret || !env.spacesEndpoint) return null
  if (!client) {
    client = new S3Client({
      region: env.spacesRegion,
      endpoint: env.spacesEndpoint,
      credentials: {
        accessKeyId: env.spacesKey,
        secretAccessKey: env.spacesSecret,
      },
      forcePathStyle: false,
    })
  }
  return client
}

export function detectImageContentType(buffer: Buffer): ReportPhotoContentType | null {
  if (buffer.length < 12) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png'
  }
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp'
  }
  return null
}

export function isManagedPhotoKey(key: string) {
  const root = env.spacesRootPath
  if (!root) return false
  if (!key || key.includes('..') || key.includes('\\') || key.startsWith('/') || key.includes('//')) {
    return false
  }
  return key.startsWith(`${root}/`) && key.length <= 240
}

function extensionFor(contentType: ReportPhotoContentType) {
  if (contentType === 'image/png') return 'png'
  if (contentType === 'image/webp') return 'webp'
  return 'jpg'
}

function nextObjectKey(contentType: ReportPhotoContentType) {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${env.spacesRootPath}/${year}/${month}/${crypto.randomUUID()}.${extensionFor(contentType)}`
}

export async function uploadReportPhoto(buffer: Buffer, contentType: ReportPhotoContentType) {
  const s3 = spacesClient()
  if (!s3 || !env.spacesBucket) throw new Error('SPACES_UNAVAILABLE')
  if (buffer.byteLength > REPORT_PHOTO_MAX_FILE_BYTES) throw new Error('PHOTO_TOO_LARGE')

  const key = nextObjectKey(contentType)
  const base = {
    Bucket: env.spacesBucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ContentLength: buffer.byteLength,
    CacheControl: 'private, max-age=31536000',
  }

  try {
    await s3.send(new PutObjectCommand({ ...base, ACL: 'private' }))
  } catch {
    await s3.send(new PutObjectCommand(base))
  }

  return { key, content_type: contentType, byte_size: buffer.byteLength }
}

export async function signedPhotoUrl(key: string) {
  const s3 = spacesClient()
  if (!s3 || !env.spacesBucket || !isManagedPhotoKey(key)) return null
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: env.spacesBucket, Key: key }),
    { expiresIn: env.spacesExpirationMinutes * 60 },
  )
}

export function publicPhotoUrl(key: string) {
  if (!env.spacesPublicBase || !isManagedPhotoKey(key)) return null
  return `${env.spacesPublicBase}/${key}`
}

export async function photoViewUrl(key: string) {
  return (await signedPhotoUrl(key)) ?? publicPhotoUrl(key)
}
