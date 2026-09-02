import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env, isAllowedOrigin, isProduction } from './config/env.ts'
import { errorHandler, notFound } from './middleware/errorHandler.ts'
import { healthLimiter } from './middleware/rateLimit.ts'
import { sanitizeBody } from './middleware/sanitize.ts'
import { requireReportStore } from './middleware/requireStore.ts'
import { restoreVercelApiPath } from './middleware/vercelPath.ts'
import { adminRouter } from './routes/admin.ts'
import { healthHandler } from './routes/health.ts'
import { publicRouter } from './routes/public.ts'

const app = express()

app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(restoreVercelApiPath)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: isProduction ? { maxAge: 15552000, includeSubDomains: true } : false,
  }),
)
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, origin ?? env.clientOrigins[0])
        return
      }
      callback(null, false)
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '64kb' }))
app.use(sanitizeBody)

app.get('/api/health', healthLimiter, healthHandler)
app.use(requireReportStore)
app.use('/api', publicRouter)
app.use('/api/admin', adminRouter)

app.use(notFound)
app.use(errorHandler)

export default app
