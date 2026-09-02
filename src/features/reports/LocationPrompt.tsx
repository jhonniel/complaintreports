import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { APP_NAME } from '@/lib/constants'

interface LocationPromptProps {
  open: boolean
  busy: boolean
  onAllow: () => void
  onSkip: () => void
}

export function LocationPrompt({ open, busy, onAllow, onSkip }: LocationPromptProps) {
  return (
    <Modal
      open={open}
      title="Share your location?"
      dismissible={false}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onSkip} disabled={busy}>
            Continue without location
          </Button>
          <Button onClick={onAllow} loading={busy}>
            Allow location
          </Button>
        </div>
      }
    >
      <div className="flex gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pine-50 text-pine-800">
          <MapPin className="size-5" aria-hidden="true" />
        </div>
        <p className="text-sm leading-relaxed text-ink-700">
          Allow {APP_NAME} to access your location to help us identify where reports are being
          submitted. You can still send a report if you decline.
        </p>
      </div>
    </Modal>
  )
}
