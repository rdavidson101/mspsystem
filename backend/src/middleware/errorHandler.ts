import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation error', details: err.errors })
  }

  const status = err.status || err.statusCode || 500
  const isDev = process.env.NODE_ENV !== 'production'

  // Always log full error server-side
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.message}`)
  if (isDev) console.error(err.stack)

  // Never send stack traces to client
  res.status(status).json({
    message: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack }),
  })
}
