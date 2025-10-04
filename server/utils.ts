import type { Response } from 'express'
import { z } from 'zod'

export class HttpError extends Error {
  status: number
  details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

export function parseWith<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new HttpError(400, 'validation_failed', result.error.flatten())
  }
  return result.data
}

export function sendError(res: Response, error: unknown) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message, details: error.details })
  }
  if (error instanceof Error) {
    return res.status(500).json({ error: 'internal_error', message: error.message })
  }
  return res.status(500).json({ error: 'internal_error', message: 'Unknown error' })
}

export const paginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
  q: z.string().trim().optional(),
})
