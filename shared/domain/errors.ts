/**
 * Centralized semantic error taxonomy shared by the Worker API and the client.
 *
 * Rules:
 * - Never leak stack traces, SQL, or internal identifiers to the client.
 * - Every error is serialized through {@link AppError.toJSON}.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CURRENCY_MISMATCH'
  | 'UNSUPPORTED_CURRENCY'
  | 'UNSUPPORTED_ASSET'
  | 'ARITHMETIC_OVERFLOW'
  | 'EXCHANGE_RATE_UNAVAILABLE'
  | 'INSUFFICIENT_DATA'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'DATABASE_ERROR'
  | 'CONFLICT'
  | 'UPSTREAM_UNAVAILABLE'
  | 'INTERNAL_ERROR'

export interface SerializedErrorBody {
  readonly error: {
    readonly code: ErrorCode
    readonly message: string
    readonly details?: Record<string, unknown>
  }
}

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details?: Record<string, unknown>

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = new.target.name
    this.code = code
    this.status = status
    this.details = details
  }

  toJSON(): SerializedErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    }
  }
}

export class ValidationError extends AppError {
  constructor(message = 'The request payload is invalid.', details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details)
  }
}

/**
 * Raised when a pure domain invariant is violated (unsupported currency,
 * arithmetic overflow, divide-by-zero, ...). Transport layers translate this
 * into an HTTP 422 without leaking internals.
 */
export class DomainError extends AppError {
  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(code, message, 422, details)
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', id?: string) {
    super('NOT_FOUND', id ? `${resource} "${id}" was not found.` : `${resource} was not found.`, 404)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'The resource already exists.') {
    super('CONFLICT', message, 409)
  }
}

export class CurrencyMismatchError extends AppError {
  constructor(base: string, quote: string) {
    super(
      'CURRENCY_MISMATCH',
      `Cannot operate on different currencies without conversion (${base} vs ${quote}).`,
      422,
      { base, quote },
    )
  }
}

export class UnsupportedAssetError extends AppError {
  constructor(assetType: string) {
    super('UNSUPPORTED_ASSET', `Asset type "${assetType}" is not supported.`, 422, { assetType })
  }
}

export class ExchangeRateUnavailableError extends AppError {
  constructor(base: string, quote: string, date?: string) {
    super(
      'EXCHANGE_RATE_UNAVAILABLE',
      `No exchange rate available for ${base}/${quote}${date ? ` on ${date}` : ''}.`,
      422,
      { base, quote, ...(date ? { date } : {}) },
    )
  }
}

export class InsufficientDataError extends AppError {
  constructor(message = 'There is not enough data to compute this metric.', details?: Record<string, unknown>) {
    super('INSUFFICIENT_DATA', message, 422, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication is required.') {
    super('UNAUTHORIZED', message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource.') {
    super('FORBIDDEN', message, 403)
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'A persistence error occurred.', details?: Record<string, unknown>) {
    super('DATABASE_ERROR', message, 500, details)
  }
}

/**
 * Raised when an external provider (market data, FX, ...) fails. The message is
 * safe for clients; provider payloads/keys are never included.
 */
export class ExternalServiceError extends AppError {
  constructor(
    message = 'An upstream service is unavailable.',
    details?: Record<string, unknown>,
  ) {
    super('UPSTREAM_UNAVAILABLE', message, 502, details)
  }
}

export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred.') {
    super('INTERNAL_ERROR', message, 500)
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError
}
