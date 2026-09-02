import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="font-mono text-sm text-earth-600">404</p>
      <h1 className="mt-3 font-display text-4xl font-semibold">Page not found</h1>
      <p className="mt-3 max-w-md text-ink-600">
        The page you are looking for does not exist or is not available yet.
      </p>
      <Link to="/" className="mt-8">
        <Button>Return home</Button>
      </Link>
    </section>
  )
}
