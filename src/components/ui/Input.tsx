import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-md border bg-white px-3 text-sm text-ink-900 shadow-sm',
        'placeholder:text-ink-400',
        'transition-[border-color,box-shadow] duration-200 focus:border-pine-500 focus:ring-2 focus:ring-pine-500/20 focus:outline-none',
        invalid ? 'border-danger-500' : 'border-ink-200',
        'disabled:cursor-not-allowed disabled:bg-ink-100',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
})
