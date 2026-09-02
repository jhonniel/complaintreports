import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

interface LogoProps {
  variant?: 'full' | 'mark'
  tone?: 'dark' | 'light'
  className?: string
  to?: string
}

export function Logo({ variant = 'full', className, to = '/' }: LogoProps) {
  return (
    <Link
      to={to}
      className={cn('inline-flex items-center no-underline', className)}
      aria-label="Tingog Kidapawan"
    >
      <img
        src="/logo.png"
        alt=""
        className={cn(
          'shrink-0 object-contain',
          variant === 'mark' ? 'size-10' : 'h-12 w-auto sm:h-14',
        )}
      />
    </Link>
  )
}
