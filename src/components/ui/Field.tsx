import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Label } from './Label'

interface FieldProps {
  id: string
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
  className?: string
  optionalLabel?: string
}

export function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
  className,
  optionalLabel = '(optional)',
}: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [error ? errorId : undefined, !error ? hintId : undefined]
    .filter(Boolean)
    .join(' ')

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string; invalid?: boolean; 'aria-describedby'?: string }>, {
        id,
        invalid: Boolean(error),
        'aria-describedby': describedBy || undefined,
      })
    : children

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="ml-1 text-danger-600" aria-hidden="true">
            *
          </span>
        ) : null}
        {required === false ? (
          <span className="ml-1 font-normal text-ink-400">{optionalLabel}</span>
        ) : null}
      </Label>
      {control}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-danger-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
