import { APP_NAME } from '@/lib/constants'

export function PrivacyPage() {
  return (
    <article className="container-page max-w-3xl py-16 md:py-20">
      <p className="text-sm font-semibold tracking-[0.16em] text-pine-700 uppercase">Privacy</p>
      <h1 className="mt-3 font-display text-4xl font-semibold">Privacy Policy</h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-700">
        <p>
          {APP_NAME} collects personal information only to process civic reports. This includes
          your name, birth date, gender, address, phone number, optional email, the report itself,
          and location if you grant permission.
        </p>
        <p>
          Public pages never display your full name, phone number, email, address, or exact
          personal location. Only authorized administrators can view personally identifiable
          information.
        </p>
        <p>
          Location permission is optional. If you decline, you can still submit a report. Access
          location (where you used the site) is stored separately from report location (where the
          concern happened) and is not shown publicly. Ticket tracking shows status and category
          only.
        </p>
        <p>This policy will be expanded before production launch.</p>
      </div>
    </article>
  )
}
