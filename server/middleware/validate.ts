import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'
import { fieldErrors } from '../../shared/report.ts'
import { sendError } from '../lib/http.ts'

export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return sendError(res, 400, 'Please check the information you submitted.', fieldErrors(result.error))
    }
    req.body = result.data
    next()
  }
}
