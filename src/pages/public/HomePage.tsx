import { Link } from 'react-router-dom'
import { ArrowRight, Lock, MessageSquareHeart, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { cn } from '@/lib/cn'

const steps = [
  { n: '01', title: 'Submit your concern', body: 'Tell us what happened and where. No account is required.' },
  { n: '02', title: 'Receive your ticket number', body: 'Save the unique ticket we generate after you submit.' },
  { n: '03', title: 'Track your report', body: 'Use your ticket number any time to check status.' },
  { n: '04', title: 'Follow its progress', body: 'Watch as authorized staff review and act on the report.' },
]

const trust = [
  {
    icon: ShieldCheck,
    title: 'Reviewed by authorized personnel',
    body: 'Reports are handled by Kidapawan City administrators with assigned roles.',
  },
  {
    icon: Lock,
    title: 'Personal information is protected',
    body: 'Your name and contact details are never shown on public pages.',
  },
  {
    icon: MessageSquareHeart,
    title: 'Reports improve community services',
    body: 'Each ticket helps city offices see where roads, utilities, and public services need attention.',
  },
]

export function HomePage() {
  return (
    <>
      <section className="relative w-full min-w-0 overflow-hidden border-b border-pine-900/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(31,157,138,0.16),transparent_48%),linear-gradient(180deg,#f7f4ec_0%,#ece6d4_100%)]" />
        <div className="container-page relative grid min-w-0 items-center gap-8 py-10 sm:gap-10 sm:py-16 md:grid-cols-2 md:py-24">
          <div className="min-w-0 animate-fade-up">
            <p className="inline-flex max-w-full flex-wrap items-center rounded-full border border-pine-200/80 bg-white/80 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.08em] text-pine-800 uppercase sm:text-[0.72rem] sm:tracking-[0.12em]">
              Civic reporting · Kidapawan City
            </p>
            <h1 className="mt-4 font-display text-[1.6rem] font-semibold leading-[1.2] text-pretty text-ink-950 sm:text-4xl sm:leading-[1.15] lg:text-[3.15rem] lg:leading-[1.12]">
              Sumbungan sa Kidapawan.
              <span className="mt-1 block">Para sa tanan.</span>
              <span className="mt-1 block text-pine-800">Tingog, mga Kidapaweño!</span>
            </h1>
            <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-pretty text-ink-600 sm:mt-5 sm:text-base md:text-lg">
              Residents can submit complaints, concerns, and reports to help improve public
              services in Kidapawan.
            </p>
            <div className="mt-7 flex w-full flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
              <Link to="/submit" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  Submit a Report
                  <ArrowRight className="size-4 shrink-0" />
                </Button>
              </Link>
              <Link to="/track" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full bg-white/70 sm:w-auto">
                  Track My Report
                </Button>
              </Link>
            </div>
          </div>

          <Card className="min-w-0 animate-fade-up animate-delay-2 overflow-hidden">
            <div className="bg-pine-900 px-5 py-4 text-pine-50">
              <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-earth-400 uppercase">
                How a ticket looks
              </p>
              <p className="mt-2 font-mono text-xl font-medium tracking-wide break-all sm:text-2xl">
                TP-2026-000001
              </p>
            </div>
            <CardBody className="space-y-3 px-5 py-5">
              <p className="text-sm leading-relaxed text-ink-600">
                After you submit, Tingog Page gives you a unique ticket number. Keep it — that is
                how you follow your report.
              </p>
              <ul className="space-y-2.5 text-sm leading-relaxed text-ink-700">
                <li className="flex items-start gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-pine-600" />
                  <span>No registration or login for the public</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-pine-600" />
                  <span>Status updates stay on your ticket, not on a public feed</span>
                </li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="container-page w-full min-w-0 py-12 sm:py-16 md:py-20">
        <h2 className="font-display text-[1.65rem] font-semibold text-pretty sm:text-3xl md:text-4xl">
          How it works
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600 sm:mt-3 sm:text-base">
          Four simple steps from concern to follow-up. No account is required.
        </p>
        <ol className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.n}
              className={cn(
                'flex min-w-0 gap-4 rounded-xl border border-ink-200 bg-white p-5 shadow-card transition-shadow duration-300 hover:shadow-raised sm:block',
                'animate-fade-up',
                index === 1 && 'animate-delay-1',
                index === 2 && 'animate-delay-2',
                index === 3 && 'animate-delay-3',
              )}
            >
              <p className="font-mono text-sm font-medium text-earth-600 sm:mb-0">{step.n}</p>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-semibold leading-snug sm:mt-3 sm:text-xl">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600 sm:mt-2">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="w-full min-w-0 border-y border-ink-200 bg-white">
        <div className="container-page grid gap-5 py-12 sm:gap-6 sm:py-16 md:grid-cols-3 md:py-20">
          {trust.map((item, index) => (
            <div
              key={item.title}
              className={cn(
                'flex min-w-0 gap-4 md:block',
                'animate-fade-up',
                index === 1 && 'animate-delay-1',
                index === 2 && 'animate-delay-2',
              )}
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-pine-50 text-pine-700 md:size-auto md:bg-transparent md:p-0">
                <item.icon className="size-5 md:size-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-semibold leading-snug md:mt-4 md:text-xl">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600 md:mt-2">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page w-full min-w-0 py-10 sm:py-12 md:py-16">
        <div className="rounded-2xl bg-pine-900 px-5 py-7 text-pine-50 sm:px-6 sm:py-8 md:flex md:items-center md:justify-between md:gap-8 md:px-10">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-pretty text-white sm:text-2xl md:text-3xl">
              Ready to report a concern?
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-pine-100/80">
              It takes a few minutes. You will receive a ticket number to save and track.
            </p>
          </div>
          <Link to="/submit" className="mt-5 block w-full shrink-0 md:mt-0 md:w-auto">
            <Button size="lg" variant="secondary" className="w-full md:w-auto">
              Submit a Report
              <ArrowRight className="size-4 shrink-0" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  )
}
