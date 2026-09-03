import {
  REPORT_PHOTO_MAX_COUNT,
  REPORT_PHOTO_MAX_FILE_BYTES,
  REPORT_PHOTO_MAX_TOTAL_BYTES,
} from '@shared/report'

const MAX_EDGE = 1600

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Could not compress this photo.'))
      },
      'image/jpeg',
      quality,
    )
  })
}

export async function compressReportPhoto(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Use a JPEG, PNG, or WebP photo.')
  }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Use a JPEG, PNG, or WebP photo.')
  }
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not compress this photo.')
    context.drawImage(bitmap, 0, 0, width, height)
    let blob = await canvasToJpeg(canvas, 0.72)
    if (blob.size > 2.5 * 1024 * 1024) blob = await canvasToJpeg(canvas, 0.58)
    if (blob.size > REPORT_PHOTO_MAX_FILE_BYTES) blob = await canvasToJpeg(canvas, 0.44)
    if (blob.size > REPORT_PHOTO_MAX_FILE_BYTES) {
      throw new Error('That photo is still too large after compression.')
    }
    return blob
  } finally {
    bitmap.close()
  }
}

export function totalPhotoBytes(sizes: number[]) {
  return sizes.reduce((sum, size) => sum + size, 0)
}

export function canAddPhotos(currentCount: number, incomingCount: number) {
  return currentCount + incomingCount <= REPORT_PHOTO_MAX_COUNT
}

export function photosWithinTotalLimit(sizes: number[]) {
  return totalPhotoBytes(sizes) <= REPORT_PHOTO_MAX_TOTAL_BYTES
}
