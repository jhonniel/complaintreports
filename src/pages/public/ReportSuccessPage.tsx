import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check, Copy } from 'lucide-react'
import type { CreateReportResponse } from '@shared/report'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { LAST_TICKET_KEY } from '@/lib/constants'

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
    <section className="container-page animate-fade-up max-w-xl py-12 md:py-16">
      <div className="flex size-12 items-center justify-center rounded-full bg-pine-100 text-pine-800">
        <Check className="size-6" aria-hidden="true" />
      </div>
      <h1 className="mt-5 font-display text-3xl font-semibold md:text-4xl">
        Your report has been successfully submitted.
      </h1>
      <p className="mt-3 text-ink-600">
        Please save your ticket number. You can use it to check the status of your report.
      </p>
      <Card className="mt-8">
        <CardBody className="p-6">
          <p className="text-xs font-semibold tracking-[0.16em] text-ink-500 uppercase">Ticket number</p>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-wide text-pine-900 md:text-3xl">
            {result.ticket_number}
          </p>
          <Button className="mt-5 w-full sm:w-auto" variant="outline" onClick={() => void copyTicket()}>
            <Copy className="size-4" />
            {copied ? 'Copied' : 'Copy ticket number'}
          </Button>
        </CardBody>
      </Card>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link to={`/track?ticket=${encodeURIComponent(result.ticket_number)}`}>
          <Button className="w-full sm:w-auto">Track this report</Button>
        </Link>
        <Link to="/">
          <Button variant="ghost" className="w-full sm:w-auto">
            Return home
          </Button>
        </Link>
      </div>
    </section>
  )
}
