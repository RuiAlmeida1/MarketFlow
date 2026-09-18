import type {
  AllocationResponse,
  ApiErrorResponse,
  DashboardResponse,
  DividendsResponse,
  HealthResponse,
  HoldingsResponse,
  LoginRequest,
  LogoutResponse,
  MarketsResponse,
  MeResponse,
  PerformancePeriod,
  PerformanceResponse,
  PortfolioListResponse,
  SessionResponse,
  TransactionsResponse,
  WatchlistsResponse,
} from '@shared/api/contracts'
import type { AllocationDimension, Asset, Portfolio } from '@shared/domain'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''
export const UNAUTHORIZED_EVENT = 'marketflow:unauthorized'

export class ApiClientError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: Record<string, unknown>

  constructor(
    message: string,
    status: number,
    code = 'UNKNOWN',
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.status = status
    this.details = details
  }
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: { accept: 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    throw new ApiClientError(
      'Unable to reach the MarketFlow API. Is the worker running?',
      0,
      'NETWORK_ERROR',
    )
  }

  const isJson = response.headers.get('content-type')?.includes('application/json') ?? false
  const body = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    if (
      response.status === 401 &&
      !path.startsWith('/api/auth/session') &&
      !path.startsWith('/api/auth/login')
    ) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
    }
    const parsed = body as ApiErrorResponse | null
    throw new ApiClientError(
      parsed?.error?.message ?? `Request failed with status ${response.status}.`,
      response.status,
      parsed?.error?.code ?? 'HTTP_ERROR',
      parsed?.error?.details,
    )
  }

  return body as T
}

export interface DashboardParams {
  portfolioId?: string
  period?: PerformancePeriod
  dimension?: AllocationDimension
}

/** Typed client for the MarketFlow REST API. */
export const api = {
  health: () => request<HealthResponse>('/api/health'),

  me: () => request<MeResponse>('/api/me'),

  session: () => request<SessionResponse>('/api/auth/session'),

  login: (credentials: LoginRequest) =>
    request<SessionResponse>('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(credentials),
    }),

  logout: () => request<LogoutResponse>('/api/auth/logout', { method: 'POST' }),

  dashboard: (params: DashboardParams = {}) =>
    request<DashboardResponse>(`/api/dashboard${buildQuery({ ...params })}`),

  portfolios: () => request<PortfolioListResponse>('/api/portfolios'),

  portfolio: (id: string) =>
    request<{ portfolio: Portfolio }>(`/api/portfolios/${encodeURIComponent(id)}`),

  holdings: (id: string) =>
    request<HoldingsResponse>(`/api/portfolios/${encodeURIComponent(id)}/holdings`),

  transactions: (id: string) =>
    request<TransactionsResponse>(`/api/portfolios/${encodeURIComponent(id)}/transactions`),

  dividends: (id: string) =>
    request<DividendsResponse>(`/api/portfolios/${encodeURIComponent(id)}/dividends`),

  performance: (id: string, period?: PerformancePeriod) =>
    request<PerformanceResponse>(
      `/api/portfolios/${encodeURIComponent(id)}/performance${buildQuery({ period })}`,
    ),

  allocation: (id: string, dimension?: AllocationDimension) =>
    request<AllocationResponse>(
      `/api/portfolios/${encodeURIComponent(id)}/allocation${buildQuery({ dimension })}`,
    ),

  watchlists: () => request<WatchlistsResponse>('/api/watchlists'),

  markets: () => request<MarketsResponse>('/api/markets'),

  searchAssets: (q: string) =>
    request<{ assets: Asset[] }>(`/api/assets/search${buildQuery({ q })}`),
}
