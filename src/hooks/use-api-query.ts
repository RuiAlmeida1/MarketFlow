import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ApiClientError } from '../lib/api-client'
import {
  ensureQuery,
  getQuerySnapshot,
  invalidate,
  subscribeQuery,
  type QuerySnapshot,
} from '../lib/query-cache'

export interface ApiQueryResult<T> {
  data: T | null
  error: ApiClientError | null
  isLoading: boolean
  refetch: () => void
}

const IDLE_SNAPSHOT: QuerySnapshot<never> = {
  status: 'idle',
  data: null,
  error: null,
  timestamp: 0,
}

function toApiClientError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error
  return new ApiClientError(
    error instanceof Error ? error.message : 'Unexpected request error.',
    0,
    'UNKNOWN',
  )
}

interface UseApiQueryOptions {
  enabled?: boolean
}

/**
 * Typed data-fetching hook over the shared query store. Passing a `null` key
 * (or `enabled: false`) defers the request, which is how dependent queries avoid
 * waterfalls.
 */
export function useApiQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: UseApiQueryOptions = {},
): ApiQueryResult<T> {
  const enabled = options.enabled ?? true
  const activeKey = enabled ? key : null
  const fetcherRef = useRef(fetcher)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    fetcherRef.current = fetcher
  })

  const subscribe = useCallback(
    (listener: () => void) =>
      activeKey ? subscribeQuery(activeKey, listener) : () => undefined,
    [activeKey],
  )

  const getSnapshot = useCallback(
    () =>
      activeKey ? getQuerySnapshot<T>(activeKey) : (IDLE_SNAPSHOT as QuerySnapshot<T>),
    [activeKey],
  )

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  useEffect(() => {
    if (!activeKey) return
    ensureQuery(activeKey, () => fetcherRef.current())
  }, [activeKey, reloadToken])

  const refetch = useCallback(() => {
    if (!activeKey) return
    invalidate(activeKey)
    setReloadToken((token) => token + 1)
  }, [activeKey])

  return {
    data: snapshot.data,
    error: snapshot.status === 'error' ? toApiClientError(snapshot.error) : null,
    isLoading:
      activeKey !== null && (snapshot.status === 'loading' || snapshot.status === 'idle'),
    refetch,
  }
}
