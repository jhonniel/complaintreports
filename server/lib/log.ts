const SENSITIVE_KEY =
  /phone|email|full_name|first_name|last_name|fullname|address|birth_date|password|authorization|access_token|refresh_token|service_role|apikey|api_key|secret|spaces_key|user_agent|session_id|latitude|longitude/i

function toPlain(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...('code' in error ? { code: (error as { code?: string }).code } : {}),
    }
  }
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>
    return {
      message: typeof record.message === 'string' ? record.message : undefined,
      code: typeof record.code === 'string' ? record.code : undefined,
      details: typeof record.details === 'string' ? record.details : undefined,
      hint: typeof record.hint === 'string' ? record.hint : undefined,
    }
  }
  return { message: 'Unknown error' }
}

export function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.length > 240 ? `${value.slice(0, 240)}…` : value
  }
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value)) {
      output[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : redact(nested)
    }
    return output
  }
  return value
}

export function logError(scope: string, error: unknown) {
  console.error(`[tingog:${scope}]`, redact(toPlain(error)))
}
