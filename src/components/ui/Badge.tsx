import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const variants = {
  default: 'bg-ink-100 text-ink-800',
  pine: 'bg-pine-100 text-pine-800',
  earth: 'bg-earth-100 text-earth-600',
  success: 'bg-spring-50 text-spring-700',
  warning: 'bg-warn-50 text-warn-600',
  danger: 'bg-danger-50 text-danger-700',
  info: 'bg-info-50 text-info-600',
} as const

export function Badge({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
