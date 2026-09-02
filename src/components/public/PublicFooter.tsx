import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { APP_NAME, CITY_NAME } from '@/lib/constants'

const footerLinks = [
  { to: '/about', label: 'About' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms' },
  { to: '/contact', label: 'Contact' },
]

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-pine-900/10 bg-pine-950 text-pine-50">
      <div className="container-page grid gap-10 py-12 md:grid-cols-3">
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-pine-100/80">
            A civic reporting platform for residents of {CITY_NAME}. Submit concerns, receive a
            ticket, and follow progress — no account required.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-earth-400 uppercase">Explore</p>
          <ul className="mt-4 space-y-2">
            {footerLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-sm text-pine-100/85 hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-earth-400 uppercase">City</p>
          <p className="mt-4 text-sm text-pine-100/85">{CITY_NAME}</p>
          <p className="mt-1 text-sm text-pine-100/70">Province of Cotabato, Philippines</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-4 text-xs text-pine-200/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {APP_NAME}. Built for public service.
          </p>
          <p>Personal information is never shown on public pages.</p>
        </div>
      </div>
    </footer>
  )
}
