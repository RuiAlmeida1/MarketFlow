import { type AppError, type ErrorCode, isAppError } from '../../shared/domain/errors'
import { jsonResponse } from './response'

const GENERIC_SERVER_MESSAGES: Partial<Record<ErrorCode, string>> = {
  DATABASE_ERROR: 'A persistence error occurred.',
  INTERNAL_ERROR: 'An unexpected error occurred.',
}

/**
 * Converts any thrown value into a client-safe response. 5xx responses never
 * expose the original message or details (which may contain SQL, ids, ...).
 */
export function errorResponse(error: unknown): Response {
  if (isAppError(error)) {
    if (error.status >= 500) {
      return jsonResponse(
        {
          error: {
            code: error.code,
            message: GENERIC_SERVER_MESSAGES[error.code] ?? 'An unexpected error occurred.',
          },
        },
        error.status,
      )
    }
    return jsonResponse(error.toJSON(), error.status)
  }

  console.error('[api] unhandled error', error)
  return jsonResponse(
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } },
    500,
  )
}

export function isClientError(error: unknown): error is AppError {
  return isAppError(error) && error.status < 500
}
