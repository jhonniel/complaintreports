import type { LabelHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Label({ className, children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('block text-sm font-semibold text-ink-800', className)}
      {...props}
    >
      {children}
    </label>
  )
}
