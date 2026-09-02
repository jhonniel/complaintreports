import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-32 w-full rounded-md border bg-white px-3 py-2.5 text-sm text-ink-900 shadow-sm',
        'placeholder:text-ink-400',
        'transition-colors focus:border-pine-500 focus:ring-2 focus:ring-pine-500/20 focus:outline-none',
        invalid ? 'border-danger-500' : 'border-ink-200',
        'disabled:cursor-not-allowed disabled:bg-ink-100',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
})
