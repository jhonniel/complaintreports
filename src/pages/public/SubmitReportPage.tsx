import { ReportForm } from '@/features/reports/ReportForm'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'

export function SubmitReportPage() {
  const { status } = useAuth()

  return (
    <section className="container-page max-w-3xl py-10 md:py-14">
      {status === 'authenticated' ? (
        <Link
          to="/admin/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-pine-800 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to admin
        </Link>
      ) : null}
      <p className="text-sm font-semibold tracking-[0.16em] text-pine-700 uppercase">Kidapawan City</p>
      <h1 className="mt-3 font-display text-4xl font-semibold">Submit a report</h1>
      <p className="mt-3 max-w-2xl text-ink-600">
        Share a complaint or concern without creating an account. After you send it, you will
        receive a ticket number you can save and use to follow progress.
      </p>
      <div className="mt-8">
        <ReportForm />
      </div>
    </section>
  )
}
