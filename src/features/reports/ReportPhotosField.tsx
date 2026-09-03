import { ImagePlus, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { REPORT_PHOTO_MAX_COUNT, REPORT_PHOTO_MAX_TOTAL_BYTES } from '@shared/report'
import type { DraftPhoto } from '@/features/reports/reportPhotos'

export function ReportPhotosField({
  photos,
  busy,
  onAdd,
  onRemove,
}: {
  photos: DraftPhoto[]
  busy: boolean
  onAdd: (files: FileList | null) => void
  onRemove: (id: string) => void
}) {
  const remaining = REPORT_PHOTO_MAX_COUNT - photos.length
  const totalMb = photos.reduce((sum, photo) => sum + photo.byteSize, 0) / (1024 * 1024)

  return (
    <div className="space-y-3">
      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li key={photo.id} className="relative overflow-hidden rounded-lg border border-ink-200 bg-ink-50">
              <img
                src={photo.previewUrl}
                alt={`Photo ${index + 1}`}
                className="h-28 w-full object-cover"
              />
              <button
                type="button"
                className="absolute top-1.5 right-1.5 rounded-full bg-ink-950/70 p-1 text-white hover:bg-ink-950"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() => onRemove(photo.id)}
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {remaining > 0 ? (
        <label
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ink-300 bg-ink-50/60 px-4 py-6 text-center',
            busy ? 'pointer-events-none opacity-60' : 'hover:border-pine-600 hover:bg-pine-50/50',
          )}
        >
          <ImagePlus className="size-6 text-pine-800" aria-hidden="true" />
          <span className="text-sm font-semibold text-ink-800">
            {busy ? 'Compressing photos…' : 'Add photos'}
          </span>
          <span className="text-xs text-ink-500">
            JPEG, PNG, or WebP. Up to {remaining} more. {totalMb.toFixed(1)} / 10 MB used.
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            multiple
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              onAdd(event.target.files)
              event.target.value = ''
            }}
          />
        </label>
      ) : (
        <p className="text-xs text-ink-500">Maximum of {REPORT_PHOTO_MAX_COUNT} photos reached.</p>
      )}
    </div>
  )
}

export function formatPhotoLimitHint() {
  return `Optional. Up to ${REPORT_PHOTO_MAX_COUNT} photos, ${Math.round(REPORT_PHOTO_MAX_TOTAL_BYTES / (1024 * 1024))} MB total.`
}
