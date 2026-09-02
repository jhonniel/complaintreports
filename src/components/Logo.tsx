import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { APP_NAME } from '@/lib/constants'

interface LogoProps {
  variant?: 'full' | 'mark'
  tone?: 'dark' | 'light'
  className?: string
  to?: string
}

export function Logo({ variant = 'full', tone = 'dark', className, to = '/' }: LogoProps) {
  const textClass = tone === 'light' ? 'text-ink-50' : 'text-pine-900'

  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5 no-underline', className)} aria-label={APP_NAME}>
      <svg viewBox="0 0 40 40" className="size-9 shrink-0" aria-hidden="true">
        <rect width="40" height="40" rx="10" fill={tone === 'light' ? '#F6F3EB' : '#143A29'} />
        <path d="M9 26 L20 10 L31 26 Z" fill={tone === 'light' ? '#143A29' : '#F6F3EB'} />
        <path
          d="M20 16 L20 28"
          stroke={tone === 'light' ? '#168073' : '#1F9D8A'}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M16.5 20.5 C18 19 22 19 23.5 20.5"
          stroke="#C49A3C"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M14.5 23 C17 20.6 23 20.6 25.5 23"
          stroke="#C49A3C"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {variant === 'full' ? (
        <span className="leading-tight">
          <span className={cn('block font-display text-lg font-semibold tracking-tight', textClass)}>
            Tingog Page
          </span>
          <span className={cn('block text-[11px] font-medium tracking-[0.14em] uppercase', tone === 'light' ? 'text-pine-200' : 'text-ink-500')}>
            Kidapawan City
          </span>
        </span>
      ) : null}
    </Link>
  )
}
