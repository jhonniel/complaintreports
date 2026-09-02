import { Check } from 'lucide-react'
import {
  PUBLIC_TIMELINE_STATUSES,
  STATUS_LABELS,
  type PublicTimelineStatus,
  type ReportStatus,
} from '@shared/report'
import { cn } from '@/lib/cn'

interface StatusTimelineProps {
  status: ReportStatus
}

type StepState = 'complete' | 'current' | 'upcoming'

function stepState(status: ReportStatus, step: PublicTimelineStatus): StepState {
  if (status === 'rejected') {
    return step === 'submitted' ? 'complete' : 'upcoming'
  }
  const currentIndex = PUBLIC_TIMELINE_STATUSES.indexOf(status as PublicTimelineStatus)
  const stepIndex = PUBLIC_TIMELINE_STATUSES.indexOf(step)
  if (currentIndex < 0) return 'upcoming'
  if (stepIndex < currentIndex) return 'complete'
  if (stepIndex === currentIndex) return 'current'
  return 'upcoming'
}

export function StatusTimeline({ status }: StatusTimelineProps) {
  return (
    <ol className="space-y-0" aria-label="Report progress">
      {PUBLIC_TIMELINE_STATUSES.map((step, index) => {
        const state = stepState(status, step)
        const last = index === PUBLIC_TIMELINE_STATUSES.length - 1
        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-full border text-xs font-semibold',
                  state === 'complete' && 'border-pine-700 bg-pine-700 text-white',
                  state === 'current' && 'border-earth-500 bg-earth-50 text-earth-600',
                  state === 'upcoming' && 'border-ink-200 bg-white text-ink-400',
                )}
                aria-hidden="true"
              >
                {state === 'complete' ? <Check className="size-3.5" strokeWidth={3} /> : null}
                {state === 'current' ? <span className="size-2 rounded-full bg-earth-500" /> : null}
              </span>
              {last ? null : (
                <span
                  className={cn('w-px flex-1 min-h-4', state === 'complete' ? 'bg-pine-600' : 'bg-ink-200')}
                  aria-hidden="true"
                />
              )}
            </div>
            <p
              className={cn(
                'pb-4 text-sm font-medium',
                state === 'current' && 'font-semibold text-ink-950',
                state === 'complete' && 'text-ink-800',
                state === 'upcoming' && 'text-ink-400',
                last && 'pb-0',
              )}
            >
              {STATUS_LABELS[step]}
              {state === 'current' ? <span className="sr-only"> (current)</span> : null}
            </p>
          </li>
        )
      })}
    </ol>
  )
}
