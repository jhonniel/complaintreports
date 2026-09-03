import { APP_NAME } from '@/lib/constants'

export function PrivacyPage() {
  return (
    <article className="container-page max-w-3xl py-16 md:py-20">
      <p className="text-sm font-semibold tracking-[0.16em] text-pine-700 uppercase">Privacy</p>
      <h1 className="mt-3 font-display text-4xl font-semibold">Privacy Policy</h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-700">
        <p>
          {APP_NAME} collects personal information only to process civic reports. This includes
          your name, birth date, gender, address, phone number, optional email, and the report
          itself.
        </p>
        <p>
          Public pages never display your full name, phone number, email, or address. Only
          authorized administrators can view personally identifiable information.
        </p>
        <p>
          If you include an email, we use it only to send your ticket number. We do not send that
          email when the field is left blank.
        </p>
        <p>
          Ticket tracking shows status and category only. This policy will be expanded before
          production launch.
        </p>
      </div>
    </article>
  )
}
