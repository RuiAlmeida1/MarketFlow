import { DatabaseError } from '../../shared/domain/errors'

/**
 * Thin, error-normalizing wrapper around D1. Repositories are the only layer
 * allowed to touch `env.DB`; everything else depends on repositories/services.
 *
 * Raw database errors are logged server-side but never attached to the
 * `DatabaseError` returned to the client.
 */
export async function queryAll<T>(
  db: D1Database,
  sql: string,
  bindings: readonly unknown[] = [],
): Promise<T[]> {
  try {
    const statement = db.prepare(sql)
    const bound = bindings.length > 0 ? statement.bind(...bindings) : statement
    const result = await bound.all<T>()
    return result.results ?? []
  } catch (error) {
    console.error('[db] query failed', { sql, error })
    throw new DatabaseError()
  }
}

export async function queryFirst<T>(
  db: D1Database,
  sql: string,
  bindings: readonly unknown[] = [],
): Promise<T | null> {
  try {
    const statement = db.prepare(sql)
    const bound = bindings.length > 0 ? statement.bind(...bindings) : statement
    return await bound.first<T>()
  } catch (error) {
    console.error('[db] query failed', { sql, error })
    throw new DatabaseError()
  }
}

export async function executeStatement(
  db: D1Database,
  sql: string,
  bindings: readonly unknown[] = [],
): Promise<D1Result> {
  try {
    const statement = db.prepare(sql)
    const bound = bindings.length > 0 ? statement.bind(...bindings) : statement
    return await bound.run()
  } catch (error) {
    console.error('[db] statement failed', { sql, error })
    throw new DatabaseError()
  }
}

/** Builds `?, ?, ?` placeholders for an IN clause of the given size. */
export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ')
}
