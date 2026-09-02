import { useEffect, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthProvider'
import { APP_NAME, CITY_NAME, PUBLIC_NAV } from '@/lib/constants'

export function PublicHeader() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { status } = useAuth()
  const isAdmin = status === 'authenticated'

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="sticky top-0 z-40 w-full min-w-0 border-b border-pine-900/10 bg-ink-50/95 pt-[env(safe-area-inset-top)] shadow-[0_1px_0_rgb(20_58_41/0.04)] backdrop-blur-md">
      <div className="container-page flex h-14 min-w-0 items-center justify-between gap-3 md:h-16 md:gap-4">
        <Logo className="min-w-0 shrink" />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {PUBLIC_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  isActive ? 'bg-pine-50 text-pine-900' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {isAdmin ? (
            <Link to="/admin/dashboard">
              <Button variant="outline" size="sm">
                Back to admin
              </Button>
            </Link>
          ) : null}
          <Link to="/track">
            <Button variant="ghost" size="sm">
              Track
            </Button>
          </Link>
          <Link to="/submit">
            <Button size="sm">Submit a Report</Button>
          </Link>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="size-11 shrink-0 bg-white px-0 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>
      {open ? (
        <div
          id="mobile-nav"
          className="animate-slide-down border-t border-ink-100 bg-ink-50 md:hidden"
        >
          <nav
            className="container-page flex max-h-[min(100dvh-3.5rem,28rem)] flex-col overflow-y-auto py-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
            aria-label="Mobile"
          >
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-3.5 text-base font-medium ${
                    isActive ? 'bg-pine-50 text-pine-900' : 'text-ink-700'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="grid gap-2 pt-4">
              {isAdmin ? (
                <Link to="/admin/dashboard" className="w-full">
                  <Button variant="outline" className="w-full">
                    Back to admin
                  </Button>
                </Link>
              ) : null}
              <Link to="/track" className="w-full">
                <Button variant="outline" className="w-full">
                  Track a report
                </Button>
              </Link>
              <Link to="/submit" className="w-full">
                <Button className="w-full">Submit a Report</Button>
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
      <span className="sr-only">
        {APP_NAME} for {CITY_NAME}
      </span>
    </header>
  )
}
