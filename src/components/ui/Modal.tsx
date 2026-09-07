import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  title: string
  description?: string
  onClose?: () => void
  children: ReactNode
  footer?: ReactNode
  className?: string
  dismissible?: boolean
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  className,
  dismissible = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) onClose?.()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose, dismissible])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 animate-fade-in bg-ink-950/50"
        aria-label="Close dialog"
        onClick={dismissible ? onClose : undefined}
        disabled={!dismissible}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'relative z-10 mb-[env(safe-area-inset-bottom)] flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-raised sm:mb-0',
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-ink-100 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 id="modal-title" className="font-display text-lg font-semibold sm:text-xl">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
          </div>
          {dismissible ? (
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" className="shrink-0 px-2">
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
        <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer ? <div className="shrink-0 border-t border-ink-100 px-4 py-3 sm:px-5 sm:py-4">{footer}</div> : null}
      </div>
    </div>
  )
}
