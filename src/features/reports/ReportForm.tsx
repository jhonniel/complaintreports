import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createReportSchema,
  fieldErrors,
  GENDER_LABELS,
  GENDERS,
  personalFieldsSchema,
  reportFieldsSchema,
  type Gender,
  type PublicCategory,
} from '@shared/report'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { FormStepper } from '@/components/ui/FormStepper'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { LocationPrompt } from '@/features/reports/LocationPrompt'
import { fetchCategories, submitReport } from '@/features/reports/reportApi'
import { logAccessFromBrowser } from '@/features/access/accessApi'
import { useGeolocationPermission } from '@/hooks/useGeolocationPermission'
import { useToast } from '@/components/ui/Toast'
import { LAST_TICKET_KEY } from '@/lib/constants'
import { ApiError } from '@/services/api'
import { Skeleton } from '@/components/ui/Skeleton'

const STEPS = ['Your details', 'Your report', 'Review']

interface FormValues {
  full_name: string
  birth_date: string
  gender: string
  address: string
  phone: string
  email: string
  title: string
  category_id: string
  description: string
  website: string
}

const emptyValues: FormValues = {
  full_name: '',
  birth_date: '',
  gender: '',
  address: '',
  phone: '',
  email: '',
  title: '',
  category_id: '',
  description: '',
  website: '',
}

export function ReportForm() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const geo = useGeolocationPermission()
  const [step, setStep] = useState(1)
  const [values, setValues] = useState<FormValues>(emptyValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [categories, setCategories] = useState<PublicCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchCategories()
      .then((response) => {
        if (!cancelled) setCategories(response.categories)
      })
      .catch(() => {
        if (!cancelled) setCategoryError('Something went wrong. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoadingCategories(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const categoryName = useMemo(
    () => categories.find((category) => category.id === values.category_id)?.name ?? 'Not selected',
    [categories, values.category_id],
  )

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function validateStep(nextStep: number) {
    const schema = nextStep === 2 ? personalFieldsSchema : reportFieldsSchema
    const result = schema.safeParse(values)
    if (!result.success) {
      const nextErrors = fieldErrors(result.error)
      setErrors(nextErrors)
      const first = Object.keys(nextErrors)[0]
      window.setTimeout(() => document.getElementById(first)?.focus(), 0)
      return false
    }
    setErrors({})
    return true
  }

  async function handleAllowLocation() {
    const result = await geo.requestPosition()
    if (result === 'granted') {
      logAccessFromBrowser(window.location.pathname)
    }
    if (result === 'denied') {
      toast({
        variant: 'info',
        title: 'Location permission was denied',
        description: 'You can still submit your report.',
      })
    }
  }

  async function handleSubmit() {
    setFormError(null)
    const payload = {
      ...values,
      gender: values.gender as Gender,
      email: values.email.trim() ? values.email.trim() : undefined,
      location: geo.decision === 'granted' && geo.position ? geo.position : null,
    }
    const parsed = createReportSchema.safeParse(payload)
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      setStep(1)
      setFormError('Please check the information you submitted.')
      return
    }

    setSubmitting(true)
    try {
      const created = await submitReport(parsed.data)
      sessionStorage.setItem(
        LAST_TICKET_KEY,
        JSON.stringify({
          ticket_number: created.ticket_number,
          created_at: created.created_at,
          category_name: created.category_name,
        }),
      )
      navigate('/submit/success', { state: created, replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.details && typeof error.details === 'object' && !Array.isArray(error.details)) {
          setErrors(error.details as Record<string, string>)
        }
        setFormError(error.message || 'Unable to submit your report.')
      } else {
        setFormError('Unable to submit your report.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <LocationPrompt
        open={geo.needsPrompt}
        busy={geo.busy}
        onAllow={() => void handleAllowLocation()}
        onSkip={geo.dismiss}
      />

      <Card>
        <CardBody className="space-y-6 overflow-hidden p-5 md:p-8">
          <FormStepper steps={STEPS} current={step} />

          <LocationStatus
            decision={geo.decision}
            busy={geo.busy}
            onShare={() => void handleAllowLocation()}
          />

          {formError ? (
            <p className="rounded-md border border-danger-500/30 bg-danger-50 px-3 py-2 text-sm text-danger-700" role="alert">
              {formError}
            </p>
          ) : null}

          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault()
              if (step < 3) {
                if (validateStep(step + 1)) setStep((current) => current + 1)
                return
              }
              void handleSubmit()
            }}
            noValidate
          >
            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={values.website}
                onChange={(event) => update('website', event.target.value)}
              />
            </div>

            {step === 1 ? (
              <div className="grid gap-4">
                <p className="text-sm text-ink-600">
                  Personal details are visible only to authorized city staff. They are never shown on
                  public tracking pages.
                </p>
                <Field id="full_name" label="Full name" required error={errors.full_name}>
                  <Input
                    autoComplete="name"
                    value={values.full_name}
                    onChange={(event) => update('full_name', event.target.value)}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="birth_date" label="Birth date" required error={errors.birth_date}>
                    <Input
                      type="date"
                      autoComplete="bday"
                      value={values.birth_date}
                      onChange={(event) => update('birth_date', event.target.value)}
                    />
                  </Field>
                  <Field id="gender" label="Gender" required error={errors.gender}>
                    <Select value={values.gender} onChange={(event) => update('gender', event.target.value)}>
                      <option value="">Select gender</option>
                      {GENDERS.map((gender) => (
                        <option key={gender} value={gender}>
                          {GENDER_LABELS[gender]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field id="address" label="Address" required error={errors.address}>
                  <Input
                    autoComplete="street-address"
                    value={values.address}
                    onChange={(event) => update('address', event.target.value)}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="phone"
                    label="Phone number"
                    required
                    hint="Philippine mobile, for example 0917 123 4567"
                    error={errors.phone}
                  >
                    <Input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={values.phone}
                      onChange={(event) => update('phone', event.target.value)}
                    />
                  </Field>
                  <Field id="email" label="Email address" required={false} error={errors.email}>
                    <Input
                      type="email"
                      autoComplete="email"
                      value={values.email}
                      onChange={(event) => update('email', event.target.value)}
                    />
                  </Field>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-4">
                {loadingCategories ? (
                  <Skeleton className="h-11" />
                ) : categoryError ? (
                  <p className="text-sm text-danger-700" role="alert">
                    {categoryError}
                  </p>
                ) : (
                  <Field id="category_id" label="Category" required error={errors.category_id}>
                    <Select
                      value={values.category_id}
                      onChange={(event) => update('category_id', event.target.value)}
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                <Field id="title" label="Report / complaint" required error={errors.title}>
                  <Input
                    value={values.title}
                    onChange={(event) => update('title', event.target.value)}
                    placeholder="Short summary of the concern"
                  />
                </Field>
                <Field
                  id="description"
                  label="Description"
                  required
                  hint="Include what happened, when, and any details that can help city staff."
                  error={errors.description}
                >
                  <Textarea
                    value={values.description}
                    onChange={(event) => update('description', event.target.value)}
                    rows={7}
                  />
                </Field>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <ReviewGroup title="Personal information">
                  <ReviewItem label="Full name" value={values.full_name} />
                  <ReviewItem label="Birth date" value={values.birth_date} />
                  <ReviewItem
                    label="Gender"
                    value={values.gender ? GENDER_LABELS[values.gender as Gender] : '—'}
                  />
                  <ReviewItem label="Address" value={values.address} />
                  <ReviewItem label="Phone" value={values.phone} />
                  <ReviewItem label="Email" value={values.email || 'Not provided'} />
                </ReviewGroup>
                <ReviewGroup title="Report">
                  <ReviewItem label="Category" value={categoryName} />
                  <ReviewItem label="Report / complaint" value={values.title} />
                  <ReviewItem label="Description" value={values.description} />
                  <ReviewItem
                    label="Location"
                    value={
                      geo.decision === 'granted' && geo.position
                        ? 'Shared with this report'
                        : 'Not shared'
                    }
                  />
                </ReviewGroup>
              </div>
            ) : null}

            <div className="sticky bottom-0 z-10 -mx-5 mt-2 flex flex-col-reverse gap-3 border-t border-ink-100 bg-white px-5 py-3 sm:flex-row sm:justify-between md:-mx-8 md:px-8">
              {step > 1 ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFormError(null)
                    setStep((current) => current - 1)
                  }}
                >
                  Back
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" loading={submitting} disabled={loadingCategories || Boolean(categoryError)}>
                {step < 3 ? 'Continue' : 'Submit report'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  )
}

function LocationStatus({
  decision,
  busy,
  onShare,
}: {
  decision: ReturnType<typeof useGeolocationPermission>['decision']
  busy: boolean
  onShare: () => void
}) {
  if (decision === null) return null

  if (decision === 'granted') {
    return <p className="text-sm text-pine-800">Location will be attached to this report.</p>
  }

  if (decision === 'denied') {
    return (
      <p className="text-sm text-ink-600">
        Location permission was denied. You can still submit your report.
      </p>
    )
  }

  if (decision === 'unsupported') {
    return (
      <p className="text-sm text-ink-600">
        This device cannot share location. You can still submit your report.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-ink-100 px-3 py-2 text-sm text-ink-700">
      <span>Location was not shared. You can still submit your report.</span>
      <Button variant="ghost" size="sm" loading={busy} onClick={onShare}>
        Share location
      </Button>
    </div>
  )
}

function ReviewGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-ink-100 bg-ink-50/80 p-4">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <dl className="mt-3 grid gap-3">{children}</dl>
    </section>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-ink-800">{value}</dd>
    </div>
  )
}
