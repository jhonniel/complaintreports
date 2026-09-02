import app from '../server/app.ts'
import { ensureSupabaseSeed } from '../server/lib/seedSupabase.ts'

void ensureSupabaseSeed()

export const config = {
  maxDuration: 30,
}

export default app
