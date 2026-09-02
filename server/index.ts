import app from './app.ts'
import { env } from './config/env.ts'
import { ensureSupabaseSeed } from './lib/seedSupabase.ts'

void ensureSupabaseSeed()

if (!env.isVercel) {
  app.listen(env.port, '0.0.0.0', () => {
    console.log(`Tingog Page API listening on http://localhost:${env.port}`)
  })
}

export default app
