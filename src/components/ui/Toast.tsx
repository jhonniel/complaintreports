import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { cn } from '@/lib/cn'

type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (input: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
  warning: CircleAlert,
}

const styles: Record<ToastVariant, string> = {
  success: 'border-spring-500/30 bg-white',
  error: 'border-danger-500/30 bg-white',
  info: 'border-info-500/30 bg-white',
  warning: 'border-warn-500/30 bg-white',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((input: Omit<ToastItem, 'id'>) => {
    const id = crypto.randomUUID()
    setToasts((current) => [...current, { ...input, id }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id))
    }, 4500)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(100%-2rem,22rem)] flex-col gap-2">
        {toasts.map((item) => {
          const Icon = icons[item.variant]
          return (
            <div
              key={item.id}
              className={cn(
                'pointer-events-auto flex animate-toast-in gap-3 rounded-lg border p-3 shadow-card',
                styles[item.variant],
              )}
              role="status"
            >
              <Icon className="mt-0.5 size-5 shrink-0 text-pine-700" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-sm text-ink-500">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="text-ink-400 hover:text-ink-700"
                aria-label="Dismiss notification"
                onClick={() => setToasts((current) => current.filter((entry) => entry.id !== item.id))}
              >
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
