import { Link } from 'react-router-dom'
import { ArrowRight, Lock, MessageSquareHeart, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'

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
    body: 'Your name, contact details, and exact personal location are never shown on public pages.',
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
      <section className="relative overflow-hidden border-b border-pine-900/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(31,157,138,0.14),transparent_42%),linear-gradient(180deg,#f7f4ec,#ece6d4)]" />
        <div className="container-page relative grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-fade-up">
            <p className="text-sm font-semibold tracking-[0.18em] text-pine-700 uppercase">
              Civic reporting for Kidapawan City
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold text-ink-950 sm:text-5xl lg:text-[3.4rem] lg:leading-[1.1]">
              Your Voice. Your Community. Your Tingog.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-600 md:text-lg">
              Residents can submit complaints, concerns, and reports to help improve public
              services in Kidapawan — without creating an account.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/submit">
                <Button size="lg" className="w-full sm:w-auto">
                  Submit a Report
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link to="/track">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Track My Report
                </Button>
              </Link>
            </div>
          </div>
          <Card className="animate-fade-up overflow-hidden">
            <div className="bg-pine-900 px-5 py-4 text-pine-50">
              <p className="text-xs font-semibold tracking-[0.16em] text-earth-400 uppercase">
                How a ticket looks
              </p>
              <p className="mt-2 font-mono text-2xl font-medium">TP-2026-000001</p>
            </div>
            <CardBody className="space-y-3">
              <p className="text-sm text-ink-600">
                After you submit, Tingog Page gives you a unique ticket number. Keep it — that is
                how you follow your report.
              </p>
              <ul className="space-y-2 text-sm text-ink-700">
                <li className="flex gap-2">
                  <span className="mt-1 size-1.5 rounded-full bg-pine-600" />
                  No registration or login for the public
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 size-1.5 rounded-full bg-pine-600" />
                  Location sharing is optional
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 size-1.5 rounded-full bg-pine-600" />
                  Status updates stay on your ticket, not on a public feed
                </li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        <h2 className="font-display text-3xl font-semibold md:text-4xl">How it works</h2>
        <p className="mt-3 max-w-2xl text-ink-600">
          Four simple steps from concern to follow-up. No account is required.
        </p>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li key={step.n} className="rounded-xl border border-ink-200 bg-white p-5 shadow-card">
              <p className="font-mono text-sm font-medium text-earth-600">{step.n}</p>
              <h3 className="mt-3 font-display text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-ink-200 bg-white">
        <div className="container-page grid gap-6 py-16 md:grid-cols-3 md:py-20">
          {trust.map((item) => (
            <div key={item.title}>
              <item.icon className="size-6 text-pine-700" aria-hidden="true" />
              <h3 className="mt-4 font-display text-xl font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-12 md:py-16">
        <div className="rounded-2xl bg-pine-900 px-6 py-8 text-pine-50 md:flex md:items-center md:justify-between md:px-10">
          <div>
            <h2 className="font-display text-2xl font-semibold text-white md:text-3xl">Ready to report a concern?</h2>
            <p className="mt-2 max-w-xl text-sm text-pine-100/80">
              It takes a few minutes. You will receive a ticket number to save and track.
            </p>
          </div>
          <Link to="/submit" className="mt-5 inline-block md:mt-0">
            <Button size="lg" variant="secondary">
              Submit a Report
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  )
}
