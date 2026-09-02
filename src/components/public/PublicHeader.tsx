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
    <header className="sticky top-0 z-40 border-b border-pine-900/10 bg-ink-50/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
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
          variant="ghost"
          size="sm"
          className="px-2 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>
      {open ? (
        <div id="mobile-nav" className="animate-slide-down border-t border-ink-100 bg-ink-50 md:hidden">
          <nav className="container-page flex flex-col py-3" aria-label="Mobile">
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `rounded-md px-3 py-3 text-sm font-medium ${
                    isActive ? 'bg-pine-50 text-pine-900' : 'text-ink-700'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {isAdmin ? (
              <Link to="/admin/dashboard" className="mt-2">
                <Button variant="outline" className="w-full">
                  Back to admin
                </Button>
              </Link>
            ) : null}
            <Link to="/track" className="mt-2">
              <Button variant="outline" className="w-full">
                Track a report
              </Button>
            </Link>
            <Link to="/submit" className="mt-2">
              <Button className="w-full">Submit a Report</Button>
            </Link>
          </nav>
        </div>
      ) : null}
      <span className="sr-only">
        {APP_NAME} for {CITY_NAME}
      </span>
    </header>
  )
}
