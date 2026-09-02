import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/cn'

interface EmptyStateProps {
  title: string
  description: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-pine-50 text-pine-700">
        {icon ?? <Inbox className="size-6" aria-hidden="true" />}
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-ink-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
