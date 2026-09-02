import { cn } from '@/lib/cn'

interface FormStepperProps {
  steps: string[]
  current: number
}

export function FormStepper({ steps, current }: FormStepperProps) {
  return (
    <div>
      <p className="sr-only" aria-live="polite">
        Step {current} of {steps.length}: {steps[current - 1]}
      </p>
      <ol className="flex items-center gap-2" aria-hidden="true">
      {steps.map((label, index) => {
        const step = index + 1
        const active = step === current
        const done = step < current
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  done && 'bg-pine-700 text-white',
                  active && 'bg-pine-800 text-white',
                  !done && !active && 'bg-ink-100 text-ink-500',
                )}
                aria-current={active ? 'step' : undefined}
              >
                {step}
              </span>
              <span className={cn('hidden truncate text-sm sm:inline', active ? 'font-semibold text-ink-900' : 'text-ink-500')}>
                {label}
              </span>
            </div>
            {step < steps.length ? <span className="hidden h-px flex-1 bg-ink-200 sm:block" aria-hidden="true" /> : null}
          </li>
        )
      })}
    </ol>
    </div>
  )
}
