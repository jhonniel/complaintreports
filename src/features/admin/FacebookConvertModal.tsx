import { useMemo, useState } from 'react'
import type { FacebookIntakeItem } from '@shared/facebookIntake'
import {
  descriptionFromFacebookIntake,
  facebookConvertSchema,
  splitAuthorName,
  titleFromFacebookMessage,
} from '@shared/facebookIntake'
import {
  GENDERS,
  GENDER_LABELS,
  fieldErrors,
  limitPhoneDigits,
  type Gender,
} from '@shared/report'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { convertFacebookIntake } from '@/features/admin/facebookApi'
import { ApiError } from '@/services/api'

interface FacebookConvertModalProps {
  intake: FacebookIntakeItem
  categories: { id: string; name: string; is_active: boolean }[]
  onClose: () => void
  onConverted: (intake: FacebookIntakeItem) => void
}

const emptyForm = {
  first_name: '',
  last_name: '',
  birth_date: '',
  gender: '' as Gender | '',
  address: '',
  phone: '',
  email: '',
  title: '',
  category_id: '',
  description: '',
}

export function FacebookConvertModal({
  intake,
  categories,
  onClose,
  onConverted,
}: FacebookConvertModalProps) {
  const defaults = useMemo(() => {
    const names = splitAuthorName(intake.author_name)
    return {
      ...emptyForm,
      first_name: names.first_name,
      last_name: names.last_name,
      title: titleFromFacebookMessage(intake.message),
      description: descriptionFromFacebookIntake(intake),
    }
  }, [intake])

  const [values, setValues] = useState(defaults)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function submit() {
    setFormError(null)
    const parsed = facebookConvertSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setErrors({})
    setSaving(true)
    try {
      const result = await convertFacebookIntake(intake.id, parsed.data)
      onConverted(result.intake)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Could not create the ticket.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title="Create ticket from Facebook"
      description="Add the reporter details staff can use to follow up. Public tickets still need a name, 11-digit mobile number, and address."
      onClose={onClose}
      className="max-w-2xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={saving}>
            Create ticket
          </Button>
        </div>
      }
    >
      <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
        {formError ? (
          <p className="text-sm font-medium text-danger-600" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="fb-first-name" label="First name" required error={errors.first_name}>
            <Input value={values.first_name} onChange={(event) => update('first_name', event.target.value)} />
          </Field>
          <Field id="fb-last-name" label="Last name" required error={errors.last_name}>
            <Input value={values.last_name} onChange={(event) => update('last_name', event.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="fb-birth-date" label="Birth date" required error={errors.birth_date}>
            <Input
              type="date"
              value={values.birth_date}
              onChange={(event) => update('birth_date', event.target.value)}
            />
          </Field>
          <Field id="fb-gender" label="Gender" required error={errors.gender}>
            <Select value={values.gender} onChange={(event) => update('gender', event.target.value as Gender | '')}>
              <option value="">Select gender</option>
              {GENDERS.map((gender) => (
                <option key={gender} value={gender}>
                  {GENDER_LABELS[gender]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field id="fb-address" label="Address" required error={errors.address}>
          <Input value={values.address} onChange={(event) => update('address', event.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="fb-phone"
            label="Mobile number"
            required
            error={errors.phone}
            hint="11 digits, starting with 09"
          >
            <Input
              inputMode="numeric"
              value={values.phone}
              onChange={(event) => update('phone', limitPhoneDigits(event.target.value))}
            />
          </Field>
          <Field id="fb-email" label="Email" required={false} error={errors.email}>
            <Input value={values.email} onChange={(event) => update('email', event.target.value)} />
          </Field>
        </div>
        <Field id="fb-category" label="Category" required error={errors.category_id}>
          <Select value={values.category_id} onChange={(event) => update('category_id', event.target.value)}>
            <option value="">Choose a category</option>
            {categories
              .filter((category) => category.is_active)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field id="fb-title" label="Title" required error={errors.title}>
          <Input value={values.title} onChange={(event) => update('title', event.target.value)} />
        </Field>
        <Field id="fb-description" label="Description" required error={errors.description}>
          <Textarea
            value={values.description}
            onChange={(event) => update('description', event.target.value)}
            className="min-h-40"
          />
        </Field>
      </div>
    </Modal>
  )
}
