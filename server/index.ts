import app from './app.ts'
import { env } from './config/env.ts'

if (!env.isVercel) {
  app.listen(env.port, () => {
    console.log(`Tingog Page API listening on http://localhost:${env.port}`)
  })
}

export default app
