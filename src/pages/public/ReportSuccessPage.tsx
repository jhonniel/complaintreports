import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check, Copy } from 'lucide-react'
import type { CreateReportResponse } from '@shared/report'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { LAST_TICKET_KEY } from '@/lib/constants'
import { useAuth } from '@/features/auth/AuthProvider'

function readStoredTicket(): CreateReportResponse | null {
  const raw = sessionStorage.getItem(LAST_TICKET_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as CreateReportResponse
    if (!parsed.ticket_number) return null
    return parsed
  } catch {
    return null
  }
}

export function ReportSuccessPage() {
  const location = useLocation()
  const { toast } = useToast()
  const { status } = useAuth()
  const isAdmin = status === 'authenticated'
  const [copied, setCopied] = useState(false)
  const result = useMemo(() => {
    const fromState = location.state as CreateReportResponse | null
    return fromState?.ticket_number ? fromState : readStoredTicket()
  }, [location.state])

  async function copyTicket() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.ticket_number)
      setCopied(true)
      toast({ variant: 'success', title: 'Ticket number copied' })
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ variant: 'error', title: 'Unable to copy. Please copy the number manually.' })
    }
  }

  if (!result) {
    return (
      <section className="container-page max-w-xl py-16 text-center">
        <h1 className="font-display text-3xl font-semibold">No ticket to display</h1>
        <p className="mt-3 text-ink-600">Submit a report to receive a ticket number.</p>
        <Link to="/submit" className="mt-8 inline-block">
          <Button>Submit a report</Button>
        </Link>
      </section>
    )
  }

  return (
    <section className="container-page animate-fade-up max-w-xl py-12 text-center md:py-16">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-pine-100 text-pine-800">
        <Check className="size-8" aria-hidden="true" />
      </div>
      <h1 className="mt-5 font-display text-3xl font-semibold text-pretty md:text-4xl">
        Your report has been successfully submitted.
      </h1>
      <p className="mx-auto mt-3 max-w-md text-ink-600">
        Please save your ticket number. You can use it to check the status of your report. If you
        entered an email, we also sent the ticket number there.
      </p>
      <Card className="mt-8">
        <CardBody className="p-6 sm:p-8">
          <p className="text-xs font-semibold tracking-[0.16em] text-ink-500 uppercase">Ticket number</p>
          <p className="mt-3 font-mono text-2xl font-semibold tracking-wide break-all text-pine-900 md:text-3xl">
            {result.ticket_number}
          </p>
          <Button className="mx-auto mt-6 w-full sm:w-auto" variant="outline" onClick={() => void copyTicket()}>
            <Copy className="size-4" />
            {copied ? 'Copied' : 'Copy ticket number'}
          </Button>
        </CardBody>
      </Card>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link to={`/track?ticket=${encodeURIComponent(result.ticket_number)}`} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">Track this report</Button>
        </Link>
        {isAdmin ? (
          <Link to={`/admin/reports/${encodeURIComponent(result.ticket_number)}`} className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              View in admin
            </Button>
          </Link>
        ) : null}
        <Link to={isAdmin ? '/admin/dashboard' : '/'} className="w-full sm:w-auto">
          <Button variant="ghost" className="w-full sm:w-auto">
            {isAdmin ? 'Back to admin' : 'Return home'}
          </Button>
        </Link>
      </div>
    </section>
  )
}
