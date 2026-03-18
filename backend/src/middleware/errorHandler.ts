import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err.name === 'AppError') {
    return res.status(err.statusCode).json({ error: err.message })
  }
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation error', details: err.errors })
  }
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}
