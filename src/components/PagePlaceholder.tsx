import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

interface PagePlaceholderProps {
  eyebrow?: string
  title: string
  description: string
  actionTo?: string
  actionLabel?: string
}

export function PagePlaceholder({
  eyebrow = 'Coming in a later phase',
  title,
  description,
  actionTo,
  actionLabel,
}: PagePlaceholderProps) {
  return (
    <section className="container-page py-16 md:py-24">
      <p className="text-sm font-semibold tracking-[0.16em] text-pine-700 uppercase">{eyebrow}</p>
      <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold md:text-5xl">{title}</h1>
      <p className="mt-4 max-w-xl text-base text-ink-600 md:text-lg">{description}</p>
      {actionTo && actionLabel ? (
        <div className="mt-8">
          <Link to={actionTo}>
            <Button>{actionLabel}</Button>
          </Link>
        </div>
      ) : null}
    </section>
  )
}
