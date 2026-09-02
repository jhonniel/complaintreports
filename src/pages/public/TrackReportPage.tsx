import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { isTicketNumber, normalizeTicketNumber, STATUS_LABELS, type PublicTrackView } from '@shared/report'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatusTimeline } from '@/features/reports/StatusTimeline'
import { trackReport } from '@/features/reports/reportApi'
import { ApiError } from '@/services/api'
import { formatMediumDate } from '@/utils/format'
import { Badge } from '@/components/ui/Badge'

const statusBadge: Record<PublicTrackView['status'], 'default' | 'pine' | 'earth' | 'success' | 'danger' | 'info'> = {
  submitted: 'default',
  received: 'info',
  under_review: 'earth',
  in_progress: 'pine',
  resolved: 'success',
  closed: 'default',
  rejected: 'danger',
}

export function TrackReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const ticketQuery = searchParams.get('ticket') ?? ''
  const [ticket, setTicket] = useState(ticketQuery)
  const [result, setResult] = useState<PublicTrackView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const fetchedRef = useRef<string | null>(null)

  async function lookup(raw: string, syncUrl: boolean) {
    const normalized = normalizeTicketNumber(raw)
    setError(null)

    if (!normalized) {
      setResult(null)
      setError('Enter your ticket number.')
      return
    }
    if (!isTicketNumber(normalized)) {
      setResult(null)
      setError('Enter a valid ticket number.')
      return
    }

    setTicket(normalized)
    if (syncUrl && ticketQuery !== normalized) {
      setSearchParams({ ticket: normalized }, { replace: true })
    }
    if (fetchedRef.current === normalized) return

    setLoading(true)
    try {
      const report = await trackReport(normalized)
      fetchedRef.current = normalized
      setResult(report)
      window.requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    } catch (err) {
      fetchedRef.current = null
      setResult(null)
      if (err instanceof ApiError && err.status === 404) {
        setError('Ticket number not found.')
      } else if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!ticketQuery) return
    setTicket(ticketQuery)
    void lookup(ticketQuery, false)
    // Lookup whenever the ticket in the URL changes (success page, shared links).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketQuery])

  const visibleError = error && !result && !loading ? error : undefined

  return (
    <section className="container-page animate-fade-up max-w-xl py-10 md:py-14">
      <p className="text-sm font-semibold tracking-[0.16em] text-pine-700 uppercase">Kidapawan City</p>
      <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Track your report</h1>
      <p className="mt-3 text-ink-600">
        Enter your ticket number to see its status. Personal information is never shown on this page.
      </p>

      <Card className="mt-8">
        <CardBody className="p-5 md:p-6">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              fetchedRef.current = null
              void lookup(ticket, true)
            }}
            noValidate
          >
            <Field
              id="ticket"
              label="Ticket number"
              hint="Example: TP-2026-000001"
              error={visibleError}
            >
              <Input
                value={ticket}
                onChange={(event) => {
                  setTicket(event.target.value.toUpperCase())
                  setError(null)
                }}
                name="ticket"
                placeholder="TP-2026-000001"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                enterKeyHint="search"
                inputMode="text"
              />
            </Field>
            <Button type="submit" className="w-full" loading={loading} aria-busy={loading}>
              Track report
            </Button>
          </form>
        </CardBody>
      </Card>

      <div ref={resultRef}>
        {loading ? (
          <Card className="mt-6">
            <CardBody className="space-y-4 p-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-40 w-full" />
            </CardBody>
          </Card>
        ) : null}

        {visibleError ? (
          <p className="mt-6 rounded-md border border-danger-500/20 bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
            {visibleError}
          </p>
        ) : null}

        {result && !loading ? (
          <Card className="mt-6 animate-fade-up">
            <CardBody className="space-y-6 p-6" aria-live="polite">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-ink-500 uppercase">Ticket</p>
                <p className="mt-1 font-mono text-2xl font-semibold break-all text-pine-900">{result.ticket_number}</p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-ink-500 uppercase">Status</p>
                <div className="mt-2">
                  <Badge variant={statusBadge[result.status]} className="text-sm">
                    {STATUS_LABELS[result.status]}
                  </Badge>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-ink-500 uppercase">Category</p>
                  <p className="mt-1 text-sm text-ink-800">{result.category_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-ink-500 uppercase">Submitted</p>
                  <p className="mt-1 text-sm text-ink-800">{formatMediumDate(result.created_at)}</p>
                </div>
              </div>
              {result.status === 'rejected' ? (
                <p className="rounded-md border border-danger-500/20 bg-danger-50 px-3 py-2 text-sm text-danger-700">
                  This report was reviewed and not accepted.
                </p>
              ) : null}
              <div>
                <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-ink-500 uppercase">Progress</p>
                <StatusTimeline status={result.status} />
              </div>
            </CardBody>
          </Card>
        ) : null}
      </div>

      <p className="mt-8 text-sm text-ink-500">
        Lost your ticket? You will need the number from your confirmation page.{' '}
        <Link to="/submit" className="font-semibold text-pine-800 hover:underline">
          Submit a new report
        </Link>
      </p>
    </section>
  )
}
