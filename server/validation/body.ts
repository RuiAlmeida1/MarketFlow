import type { z } from 'zod'
import { ValidationError } from '../../shared/domain/errors'

/** Reads and validates a JSON request body at the HTTP boundary. */
export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    throw new ValidationError('Request body must be valid JSON.')
  }

  const result = schema.safeParse(payload)
  if (!result.success) {
    throw new ValidationError('Invalid request body.', {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }
  return result.data
}
