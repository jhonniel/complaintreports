import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'
import {
  combinePersonName,
  createReportSchema,
  fieldErrors,
  GENDER_LABELS,
  GENDERS,
  limitPhoneDigits,
  personalFieldsSchema,
  REPORT_PHOTO_MAX_COUNT,
  reportFieldsSchema,
  type Gender,
  type PublicCategory,
} from '@shared/report'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { FormStepper } from '@/components/ui/FormStepper'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { fetchCategories, submitReport, uploadReportPhoto } from '@/features/reports/reportApi'
import { formatPhotoLimitHint, ReportPhotosField } from '@/features/reports/ReportPhotosField'
import type { DraftPhoto } from '@/features/reports/reportPhotos'
import { LAST_TICKET_KEY } from '@/lib/constants'
import { canAddPhotos, compressReportPhoto, photosWithinTotalLimit } from '@/lib/compressImage'
import { cn } from '@/lib/cn'
import { ApiError } from '@/services/api'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatIsoDate } from '@/utils/format'
import {
  clearStoredLocationPrompt,
  queryGeolocationPermission,
  readStoredLocationPrompt,
  requestReportLocation,
  writeStoredLocationPrompt,
  type ReportLocation,
} from '@/lib/geolocation'

const STEPS = ['Your details', 'Your report', 'Review']
const PERSONAL_KEYS = new Set([
  'first_name',
  'last_name',
  'birth_date',
  'gender',
  'address',
  'phone',
  'email',
])

function stepForErrors(errors: Record<string, string>) {
  const keys = Object.keys(errors)
  if (keys.some((key) => PERSONAL_KEYS.has(key))) return 1
  if (keys.some((key) => key === 'category_id' || key === 'title' || key === 'description' || key === 'photos' || key.startsWith('photos.'))) return 2
  return 3
}

interface FormValues {
  first_name: string
  last_name: string
  birth_date: string
  gender: string
  address: string
  phone: string
  email: string
  title: string
  category_id: string
  description: string
  tp_hp: string
}

const emptyValues: FormValues = {
  first_name: '',
  last_name: '',
  birth_date: '',
  gender: '',
  address: '',
  phone: '',
  email: '',
  title: '',
  category_id: '',
  description: '',
  tp_hp: '',
}

export function ReportForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [values, setValues] = useState<FormValues>(emptyValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [categories, setCategories] = useState<PublicCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [photos, setPhotos] = useState<DraftPhoto[]>([])
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [compressingPhotos, setCompressingPhotos] = useState(false)
  const [location, setLocation] = useState<ReportLocation | null>(() => {
    const stored = readStoredLocationPrompt()
    return stored?.decision === 'captured' ? stored.location : null
  })
  const locationRequest = useRef<Promise<ReportLocation | null> | null>(null)
  const locationRef = useRef(location)
  locationRef.current = location
  const photosRef = useRef(photos)
  photosRef.current = photos

  useEffect(() => {
    void loadCategories()
  }, [])

  useEffect(() => {
    const stored = readStoredLocationPrompt()
    if (stored?.decision === 'captured') return

    let cancelled = false
    void (async () => {
      const permission = await queryGeolocationPermission()
      if (cancelled) return
      if (permission === 'granted') void captureLocation()
    })()

    return () => {
      cancelled = true
    }
  }, [])

  async function loadCategories() {
    setLoadingCategories(true)
    setCategoryError(null)
    try {
      const response = await fetchCategories()
      setCategories(response.categories)
      if (response.categories.length === 0) {
        setCategoryError('No categories are available yet. Please try again later.')
      }
    } catch (error) {
      setCategoryError(
        error instanceof ApiError ? error.message : 'Could not load categories. Please try again.',
      )
    } finally {
      setLoadingCategories(false)
    }
  }

  const categoryName = useMemo(
    () => categories.find((category) => category.id === values.category_id)?.name ?? 'Not selected',
    [categories, values.category_id],
  )

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) URL.revokeObjectURL(photo.previewUrl)
    }
  }, [])

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const next = current.filter((photo) => photo.id !== id)
      const removed = current.find((photo) => photo.id === id)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return next
    })
    setPhotoError(null)
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return
    if (!canAddPhotos(photos.length, files.length)) {
      setPhotoError(`You can attach up to ${REPORT_PHOTO_MAX_COUNT} photos.`)
      return
    }
    setPhotoError(null)
    setCompressingPhotos(true)
    const added: DraftPhoto[] = []
    try {
      for (const file of Array.from(files)) {
        const blob = await compressReportPhoto(file)
        added.push({
          id: crypto.randomUUID(),
          previewUrl: URL.createObjectURL(blob),
          blob,
          byteSize: blob.size,
        })
      }
      const combined = [...photos, ...added]
      if (!photosWithinTotalLimit(combined.map((photo) => photo.byteSize))) {
        for (const photo of added) URL.revokeObjectURL(photo.previewUrl)
        setPhotoError('Photos must be 10 MB or less in total.')
        return
      }
      setPhotos(combined)
    } catch (error) {
      for (const photo of added) URL.revokeObjectURL(photo.previewUrl)
      setPhotoError(error instanceof Error ? error.message : 'Could not add that photo.')
    } finally {
      setCompressingPhotos(false)
    }
  }

  async function captureLocation() {
    if (locationRef.current) return locationRef.current
    if (locationRequest.current) return locationRequest.current

    const pending = requestReportLocation().then((result) => {
      if (result.ok) {
        locationRef.current = result.location
        setLocation(result.location)
        writeStoredLocationPrompt({ decision: 'captured', location: result.location })
        return result.location
      }
      return null
    })
    locationRequest.current = pending
    const captured = await pending
    if (locationRequest.current === pending) locationRequest.current = null
    return captured
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

  async function handleSubmit() {
    setFormError(null)
    setSubmitting(true)
    try {
      const captured = location ?? (await captureLocation())
      const uploadedPhotos = []
      for (const photo of photos) {
        uploadedPhotos.push(await uploadReportPhoto(photo.blob))
      }
      const payload = {
        ...values,
        gender: values.gender as Gender,
        email: values.email.trim() ? values.email.trim() : undefined,
        location: captured,
        photos: uploadedPhotos,
      }
      const parsed = createReportSchema.safeParse(payload)
      if (!parsed.success) {
        const nextErrors = fieldErrors(parsed.error)
        setErrors(nextErrors)
        setStep(stepForErrors(nextErrors))
        setFormError('Please check the information you submitted.')
        return
      }

      const created = await submitReport(parsed.data)
      clearStoredLocationPrompt()
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
          const nextErrors = error.details as Record<string, string>
          setErrors(nextErrors)
          setStep(stepForErrors(nextErrors))
        }
        setFormError(error.message || 'Unable to submit your report.')
      } else {
        setFormError('Unable to submit your report. Check your connection and try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardBody className="space-y-6 p-5 md:p-8">
          <FormStepper steps={STEPS} current={step} />

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
                if (!validateStep(step + 1)) return
                void captureLocation()
                setStep((current) => current + 1)
                return
              }
              void handleSubmit()
            }}
            noValidate
          >
            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="tp_hp">Company</label>
              <input
                id="tp_hp"
                name="tp_hp"
                tabIndex={-1}
                autoComplete="off"
                value={values.tp_hp}
                onChange={(event) => update('tp_hp', event.target.value)}
              />
            </div>

            <div key={step} className="animate-fade-up">
            {step === 1 ? (
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="first_name" label="First name" required error={errors.first_name}>
                    <Input
                      autoComplete="given-name"
                      value={values.first_name}
                      onChange={(event) => update('first_name', event.target.value)}
                    />
                  </Field>
                  <Field id="last_name" label="Last name" required error={errors.last_name}>
                    <Input
                      autoComplete="family-name"
                      value={values.last_name}
                      onChange={(event) => update('last_name', event.target.value)}
                    />
                  </Field>
                </div>
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
                    hint="11 digits only, for example 09171234567"
                    error={errors.phone}
                  >
                    <Input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={11}
                      value={values.phone}
                      onChange={(event) => update('phone', limitPhoneDigits(event.target.value))}
                    />
                  </Field>
                  <Field
                    id="email"
                    label="Email address"
                    required={false}
                    hint="Optional. We will send your ticket number here. Leave blank if you do not want an email."
                    error={errors.email}
                  >
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
                  <div className="space-y-2" role="alert">
                    <p className="text-sm text-danger-700">{categoryError}</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => void loadCategories()}>
                      Retry
                    </Button>
                  </div>
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
                <Field
                  id="photos"
                  label="Photos"
                  required={false}
                  hint={formatPhotoLimitHint()}
                  error={photoError ?? errors.photos}
                >
                  <div>
                    <ReportPhotosField
                      photos={photos}
                      busy={compressingPhotos}
                      onAdd={(files) => void addPhotos(files)}
                      onRemove={removePhoto}
                    />
                  </div>
                </Field>
              </div>
            ) : null}

            {step === 3 ? (
              <ReviewSummary
                values={values}
                categoryName={categoryName}
                photos={photos}
                onEditDetails={() => {
                  setFormError(null)
                  setStep(1)
                }}
                onEditReport={() => {
                  setFormError(null)
                  setStep(2)
                }}
              />
            ) : null}
            </div>

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
              <Button
                type="submit"
                loading={submitting}
                disabled={
                  submitting ||
                  compressingPhotos ||
                  (step >= 2 && loadingCategories) ||
                  (step === 3 && (categories.length === 0 || Boolean(categoryError)))
                }
              >
                {step < 3 ? 'Continue' : 'Submit report'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
  )
}

function ReviewSummary({
  values,
  categoryName,
  photos,
  onEditDetails,
  onEditReport,
}: {
  values: FormValues
  categoryName: string
  photos: DraftPhoto[]
  onEditDetails: () => void
  onEditReport: () => void
}) {
  const fullName = combinePersonName(values.first_name, values.last_name) || 'Resident'
  const gender = values.gender ? GENDER_LABELS[values.gender as Gender] : '—'

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-600">
        Confirm this once. You can change any section before you send the report.
      </p>

      <section className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm">
        <header className="flex flex-col gap-4 border-b border-ink-100 bg-gradient-to-br from-pine-50/80 to-white px-5 py-5 sm:flex-row sm:items-start sm:justify-between md:px-6">
          <div className="min-w-0">
            <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-pine-700 uppercase">Reporter</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-pretty text-ink-950">{fullName}</h2>
            <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-ink-700">
              <MapPin className="mt-0.5 size-4 shrink-0 text-pine-700" aria-hidden="true" />
              <span>{values.address}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
            <Badge variant="pine" className="normal-case tracking-normal">
              {categoryName}
            </Badge>
            <button
              type="button"
              className="text-sm font-semibold text-pine-800 hover:underline"
              onClick={onEditDetails}
            >
              Change details
            </button>
          </div>
        </header>

        <dl className="grid sm:grid-cols-2">
          <ReviewFact
            icon={Phone}
            label="Phone"
            value={values.phone}
            className="border-b border-ink-100 sm:border-r"
          />
          <ReviewFact
            icon={Mail}
            label="Email"
            value={values.email.trim() ? values.email : 'Not provided'}
            className="border-b border-ink-100"
          />
          <ReviewFact
            label="Birth date"
            value={formatIsoDate(values.birth_date)}
            className="border-b border-ink-100 sm:border-r sm:border-b-0"
          />
          <ReviewFact label="Gender" value={gender} />
        </dl>

        <div className="border-t border-ink-100 px-5 py-5 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-pine-700 uppercase">Your report</p>
            <button
              type="button"
              className="text-sm font-semibold text-pine-800 hover:underline"
              onClick={onEditReport}
            >
              Change report
            </button>
          </div>
          <h3 className="mt-3 font-display text-xl font-semibold text-pretty text-ink-950">{values.title}</h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{values.description}</p>
          {photos.length > 0 ? (
            <ul className="mt-5 grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <li key={photo.id} className="overflow-hidden rounded-md border border-ink-200">
                  <img src={photo.previewUrl} alt={`Photo ${index + 1}`} className="h-24 w-full object-cover" />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function ReviewFact({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon?: typeof Phone
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={cn('px-5 py-4 md:px-6', className)}>
      <div className={cn('flex gap-3', Icon ? 'items-start' : 'flex-col')}>
        {Icon ? <Icon className="mt-0.5 size-4 shrink-0 text-pine-700" aria-hidden="true" /> : null}
        <div className="min-w-0">
          <dt className="text-xs text-ink-500">{label}</dt>
          <dd className="mt-0.5 text-sm font-medium break-words text-ink-900">{value}</dd>
        </div>
      </div>
    </div>
  )
}
