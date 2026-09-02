import type { NextFunction, Request, Response } from 'express'
import { getReportStore } from '../store/index.ts'

export function requireReportStore(_req: Request, _res: Response, next: NextFunction) {
  try {
    getReportStore()
    next()
  } catch (error) {
    next(error)
  }
}
