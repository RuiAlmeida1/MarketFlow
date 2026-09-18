export type QueryStatus = 'idle' | 'loading' | 'success' | 'error'

export interface QuerySnapshot<T> {
  readonly status: QueryStatus
  readonly data: T | null
  readonly error: unknown
  readonly timestamp: number
}

const DEFAULT_TTL_MS = 30_000
const IDLE_SNAPSHOT: QuerySnapshot<never> = {
  status: 'idle',
  data: null,
  error: null,
  timestamp: 0,
}

const cache = new Map<string, QuerySnapshot<unknown>>()
const listeners = new Map<string, Set<() => void>>()

function emit(key: string): void {
  const set = listeners.get(key)
  if (!set) return
  for (const listener of set) listener()
}

export function subscribeQuery(key: string, listener: () => void): () => void {
  const set = listeners.get(key) ?? new Set<() => void>()
  set.add(listener)
  listeners.set(key, set)
  return () => {
    set.delete(listener)
    if (set.size === 0) listeners.delete(key)
  }
}

export function getQuerySnapshot<T>(key: string): QuerySnapshot<T> {
  return (cache.get(key) as QuerySnapshot<T> | undefined) ?? (IDLE_SNAPSHOT as QuerySnapshot<T>)
}

function isFresh(snapshot: QuerySnapshot<unknown>, ttl: number): boolean {
  return snapshot.status === 'success' && Date.now() - snapshot.timestamp < ttl
}

/**
 * Deduplicated fetch into the external store. Subscribers are notified when the
 * state changes; React reads it through `useSyncExternalStore`.
 */
export function ensureQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = DEFAULT_TTL_MS,
): void {
  const existing = cache.get(key) as QuerySnapshot<T> | undefined
  if (existing) {
    if (existing.status === 'loading') return
    if (isFresh(existing, ttl)) return
  }

  cache.set(key, {
    status: 'loading',
    data: existing?.data ?? null,
    error: null,
    timestamp: existing?.timestamp ?? 0,
  })
  emit(key)

  fetcher()
    .then((data) => {
      cache.set(key, { status: 'success', data, error: null, timestamp: Date.now() })
      emit(key)
    })
    .catch((error: unknown) => {
      cache.set(key, { status: 'error', data: null, error, timestamp: Date.now() })
      emit(key)
    })
}

export function invalidate(key: string | RegExp): void {
  if (typeof key === 'string') {
    if (cache.delete(key)) emit(key)
    return
  }
  for (const existing of [...cache.keys()]) {
    if (key.test(existing)) {
      cache.delete(existing)
      emit(existing)
    }
  }
}

export function clearQueryCache(): void {
  const keys = [...cache.keys()]
  cache.clear()
  keys.forEach(emit)
}
