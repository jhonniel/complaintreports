import { APP_NAME, CITY_NAME } from '@/lib/constants'

export function AboutPage() {
  return (
    <article className="container-page max-w-3xl py-16 md:py-20">
      <p className="text-sm font-semibold tracking-[0.16em] text-pine-700 uppercase">About</p>
      <h1 className="mt-3 font-display text-4xl font-semibold">A voice for {CITY_NAME}</h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-700">
        <p>
          {APP_NAME} is a public civic reporting platform. Residents can submit complaints,
          concerns, and reports related to city services without creating an account.
        </p>
        <p>
          After you submit, you receive a unique ticket number. Use that number to follow the
          status of your report. Authorized administrators review tickets, assign departments, and
          update progress.
        </p>
        <p>
          Tingog means voice. This platform exists so community concerns can be recorded, tracked,
          and acted on with care for privacy.
        </p>
      </div>
    </article>
  )
}
