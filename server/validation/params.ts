import { z } from 'zod'
import { PERFORMANCE_PERIODS } from '../../shared/api/contracts'
import { ALLOCATION_DIMENSIONS } from '../../shared/domain'
import { ValidationError } from '../../shared/domain/errors'

const idSchema = z.string().trim().min(1).max(128)

export const portfolioQuerySchema = z.object({
  portfolioId: idSchema.optional(),
})

export const dashboardQuerySchema = z.object({
  portfolioId: idSchema.optional(),
  period: z.enum(PERFORMANCE_PERIODS).optional(),
  dimension: z.enum(ALLOCATION_DIMENSIONS).optional(),
})

export const performanceQuerySchema = z.object({
  period: z.enum(PERFORMANCE_PERIODS).optional(),
})

export const allocationQuerySchema = z.object({
  dimension: z.enum(ALLOCATION_DIMENSIONS).optional(),
})

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Query is required.').max(64),
})

/**
 * Runtime validation at the HTTP boundary. Query strings are untrusted input;
 * invalid values fail with a 400 before touching the database.
 */
export function parseQuery<T>(schema: z.ZodType<T>, url: URL): T {
  const raw = Object.fromEntries(url.searchParams.entries())
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw new ValidationError('Invalid query parameters.', {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }
  return result.data
}
