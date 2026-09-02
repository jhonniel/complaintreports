import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

const variants = {
  primary:
    'bg-pine-800 text-ink-50 hover:bg-pine-900 shadow-sm disabled:bg-pine-300',
  secondary:
    'bg-earth-500 text-ink-950 hover:bg-earth-600 disabled:bg-earth-100',
  outline:
    'border border-ink-200 bg-transparent text-ink-800 hover:bg-ink-100 disabled:text-ink-400',
  ghost: 'bg-transparent text-ink-700 hover:bg-ink-100 disabled:text-ink-400',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 disabled:bg-danger-500/50',
} as const

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
} as const

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold tracking-tight transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-70',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  )
}
