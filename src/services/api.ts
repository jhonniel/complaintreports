import type { ApiErrorBody } from '@/types'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  })

  const contentType = response.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await response.json() : null

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null
    const message =
      errorBody?.error ??
      (response.status === 503
        ? 'The service is temporarily unavailable.'
        : 'Something went wrong. Please try again.')
    throw new ApiError(message, response.status, errorBody?.details)
  }

  return body as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
}
