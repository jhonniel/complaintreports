import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-11 w-full rounded-md border bg-white px-3 text-sm text-ink-900 shadow-sm',
        'transition-colors focus:border-pine-500 focus:ring-2 focus:ring-pine-500/20 focus:outline-none',
        invalid ? 'border-danger-500' : 'border-ink-200',
        'disabled:cursor-not-allowed disabled:bg-ink-100',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  )
})
