import { APP_NAME } from '@/lib/constants'

export function PrivacyPage() {
  return (
    <article className="container-page max-w-3xl py-16 md:py-20">
      <p className="text-sm font-semibold tracking-[0.16em] text-pine-700 uppercase">Privacy</p>
      <h1 className="mt-3 font-display text-4xl font-semibold">Privacy Policy</h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-700">
        <p>
          {APP_NAME} collects personal information only to process civic reports. This includes
          your name, birth date, gender, phone number, optional email, the report, and the site
          address of the concern.
        </p>
        <p>
          Public pages never display your full name, phone number, email, or site address. Only
          authorized administrators can view personally identifiable information.
        </p>
        <p>
          If you include an email, we use it only to send your ticket number. We do not send that
          email when the field is left blank.
        </p>
        <p>
          We place the report pin from GPS or a Kidapawan address you pick. The address is stored as
          street, barangay, city, province, and zip code, together with latitude and longitude so
          staff can navigate there. Suggestions only cover Kidapawan City. You can still edit the
          address afterward. The public track page never shows a map pin or coordinates.
        </p>
        <p>
          When you open the site, we save your IP address and an approximate public-network
          location so authorized staff can see System access pins and a visitor IP log. This is not
          precise GPS, and public pages never show those IPs.
        </p>
        <p>
          If you attach photos, they are compressed and stored so authorized staff can review the
          report. The public track page never shows those photos.
        </p>
        <p>
          Ticket tracking shows status and category only. This policy will be expanded before
          production launch.
        </p>
      </div>
    </article>
  )
}
