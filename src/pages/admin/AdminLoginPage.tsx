import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/features/auth/AuthProvider'

export function AdminLoginPage() {
  const { signIn, isConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit() {
    setError(null)
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setSubmitting(true)
    const message = await signIn(email.trim(), password)
    setSubmitting(false)
    if (message) {
      setError(message)
      return
    }
    const from = (location.state as { from?: string } | null)?.from
    const next = from && from.startsWith('/admin') && from !== '/admin/login' ? from : '/admin/dashboard'
    navigate(next, { replace: true })
  }

  return (
    <Card className="w-full max-w-md">
      <CardBody className="p-8">
        <Logo />
        <h1 className="mt-6 font-display text-3xl font-semibold">Admin sign in</h1>
        <p className="mt-2 text-sm text-ink-500">Authorized personnel only. Public reports do not use this page.</p>
        {!isConfigured ? (
          <p className="mt-4 rounded-md border border-warn-500/30 bg-warn-50 px-3 py-2 text-sm text-warn-600">
            Admin sign-in is not available until Supabase is configured.
          </p>
        ) : null}
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit()
          }}
          noValidate
        >
          <Field id="email" label="Email" required>
            <Input
              type="email"
              autoComplete="username"
              placeholder="admin@kidapawan.gov.ph"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <div className="relative">
            <Field id="password" label="Password" required>
              <Input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pr-11"
              />
            </Field>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 bottom-1.5 px-2"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
          {error ? (
            <p className="text-sm font-medium text-danger-600" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" loading={submitting} disabled={!isConfigured}>
            Sign in
          </Button>
          <p className="text-center text-sm text-ink-500">
            Need to file a concern?{' '}
            <Link className="font-semibold text-pine-800 hover:underline" to="/submit">
              Submit a public report
            </Link>
          </p>
        </form>
      </CardBody>
    </Card>
  )
}
