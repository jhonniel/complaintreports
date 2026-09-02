import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-pine-950">
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
        <div className="absolute -top-24 -left-16 size-80 rounded-full bg-spring-600/30 blur-3xl" />
        <div className="absolute right-0 bottom-0 size-96 rounded-full bg-earth-500/20 blur-3xl" />
      </div>
      <main className="relative z-10 flex min-h-svh items-center justify-center p-4">
        <Outlet />
      </main>
    </div>
  )
}
