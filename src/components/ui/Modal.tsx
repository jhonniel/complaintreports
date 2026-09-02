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
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
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
          'relative z-10 w-full max-w-lg animate-scale-in rounded-xl bg-white shadow-raised',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4">
          <div>
            <h2 id="modal-title" className="font-display text-xl font-semibold">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
          </div>
          {dismissible ? (
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" className="px-2">
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-ink-100 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  )
}
