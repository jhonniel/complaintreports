import { APP_NAME } from '@/lib/constants'

export function TermsPage() {
  return (
    <article className="container-page max-w-3xl py-16 md:py-20">
      <p className="text-sm font-semibold tracking-[0.16em] text-pine-700 uppercase">Terms</p>
      <h1 className="mt-3 font-display text-4xl font-semibold">Terms of Use</h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-700">
        <p>
          Use {APP_NAME} to submit truthful reports about public services and community concerns
          in Kidapawan City. Do not submit false information or content intended to harm others.
        </p>
        <p>
          Submitting a report does not create a user account. Your ticket number is the key to
          tracking status. Keep it private if you do not want others to look up the public-safe
          status of that ticket.
        </p>
        <p>These terms will be finalized with the city before production launch.</p>
      </div>
    </article>
  )
}
