import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'

export function ContactPage() {
  return (
    <section className="container-page max-w-2xl py-16 md:py-20">
      <h1 className="font-display text-4xl font-semibold">Contact</h1>
      <p className="mt-3 text-ink-600">
        For questions about Tingog Page, reach the city offices that will operate this platform.
      </p>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Kidapawan City</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2 text-sm text-ink-700">
          <p>Civic reporting platform — Tingog Page</p>
          <p>Province of Cotabato, Philippines</p>
          <p className="text-ink-500">A public contact channel will be published before launch.</p>
        </CardBody>
      </Card>
    </section>
  )
}
