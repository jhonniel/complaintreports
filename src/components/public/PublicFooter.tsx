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
    <footer className="mt-auto border-t border-pine-900/10 bg-pine-950 pb-[env(safe-area-inset-bottom)] text-pine-50">
      <div className="container-page grid gap-8 py-10 sm:gap-10 sm:py-12 md:grid-cols-3">
        <div className="min-w-0">
          <Logo tone="light" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-pine-100/80">
            A civic reporting platform for residents of {CITY_NAME}. Submit concerns, receive a
            ticket, and follow progress.
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold tracking-[0.14em] text-earth-400 uppercase">
            Explore
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:mt-4 sm:block sm:space-y-2">
            {footerLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="inline-block py-1 text-sm text-pine-100/85 hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold tracking-[0.14em] text-earth-400 uppercase">City</p>
          <p className="mt-3 text-sm text-pine-100/85 sm:mt-4">{CITY_NAME}</p>
          <p className="mt-1 text-sm text-pine-100/70">Province of Cotabato, Philippines</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page py-4 text-xs leading-relaxed text-pine-200/70">
          <p>
            © {new Date().getFullYear()} {APP_NAME}. Built for public service.
          </p>
        </div>
      </div>
    </footer>
  )
}
