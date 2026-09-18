import type {
  AllocationDimension,
  AllocationSlice,
  Asset,
  CurrencyCode,
  DividendStatus,
  MarketQuote,
  Money,
  Portfolio,
  Transaction,
  User,
} from '../domain'
import type { ValueChange } from '../domain/portfolio/valuation'

export const PERFORMANCE_PERIODS = ['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'] as const
export type PerformancePeriod = (typeof PERFORMANCE_PERIODS)[number]

export const PERFORMANCE_PERIOD_LABELS: Record<PerformancePeriod, string> = {
  '1D': '1D',
  '1W': '1W',
  '1M': '1M',
  '3M': '3M',
  YTD: 'YTD',
  '1Y': '1Y',
  ALL: 'ALL',
}

export interface PortfolioSummaryDto {
  readonly baseCurrency: CurrencyCode
  readonly marketValue: Money
  readonly investedCapital: Money
  readonly unrealizedReturn: Money
  readonly unrealizedReturnPercentage: number
  readonly dailyChange: ValueChange
  readonly cashValue: Money
  readonly annualDividendIncome: Money
  readonly portfolioYield: number
}

export interface HoldingDto {
  readonly asset: Asset
  readonly quantity: number
  readonly averageCostPerShare: Money | null
  readonly totalCost: Money | null
  readonly lastPrice: Money | null
  readonly marketValue: Money
  readonly cost: Money
  readonly absoluteReturn: Money
  readonly returnPercentage: number
  readonly weight: number
}

export interface PerformancePointDto {
  readonly date: string
  readonly portfolioValue: Money
  readonly investedCapital: Money
}

export interface PerformanceSeriesDto {
  readonly period: PerformancePeriod
  readonly points: readonly PerformancePointDto[]
  readonly change: ValueChange
}

export interface MonthlyDividendIncomeDto {
  readonly month: number
  readonly received: Money
  readonly projected: Money
  readonly total: Money
}

export interface UpcomingDividendDto {
  readonly id: string
  readonly asset: Asset
  readonly exDate: string
  readonly paymentDate: string | null
  readonly shares: number
  readonly dividendPerShare: Money
  readonly estimatedIncome: Money
  readonly status: DividendStatus
}

export interface DividendSectionDto {
  readonly year: number
  readonly monthly: readonly MonthlyDividendIncomeDto[]
  readonly annualIncome: Money
  readonly receivedIncome: Money
  readonly projectedIncome: Money
  readonly upcoming: readonly UpcomingDividendDto[]
}

export interface WatchlistItemDto {
  readonly id: string
  readonly asset: Asset
  readonly lastPrice: Money | null
  readonly previousPrice: Money | null
  readonly dailyChange: ValueChange | null
  readonly targetPrice: Money | null
  readonly targetCurrency: CurrencyCode | null
  readonly notes: string | null
}

export interface WatchlistDto {
  readonly id: string
  readonly name: string
  readonly isDefault: boolean
  readonly items: readonly WatchlistItemDto[]
}

export interface IncomeOverviewDto {
  readonly dividends: Money
  readonly realizedGains: Money
  readonly interest: Money
  readonly otherIncome: Money
  readonly total: Money
}

export interface AllocationDto {
  readonly dimension: AllocationDimension
  readonly slices: readonly AllocationSlice[]
}

export interface DashboardResponse {
  readonly portfolio: Portfolio
  readonly generatedAt: string
  readonly summary: PortfolioSummaryDto
  readonly performance: PerformanceSeriesDto
  readonly allocation: AllocationDto
  readonly holdings: readonly HoldingDto[]
  readonly dividends: DividendSectionDto
  readonly watchlist: WatchlistDto | null
  readonly markets: readonly MarketQuote[]
  readonly income: IncomeOverviewDto
}

export interface PortfolioListResponse {
  readonly portfolios: readonly Portfolio[]
}

export interface MeResponse {
  readonly user: User
}

export interface LoginRequest {
  readonly email: string
  readonly password: string
}

export interface SessionResponse {
  readonly user: User
}

export interface LogoutResponse {
  readonly success: boolean
}

export interface HoldingsResponse {
  readonly portfolioId: string
  readonly holdings: readonly HoldingDto[]
}

export interface TransactionsResponse {
  readonly portfolioId: string
  readonly transactions: readonly Transaction[]
  readonly assets: readonly Asset[]
}

export interface PerformanceResponse {
  readonly portfolioId: string
  readonly performance: PerformanceSeriesDto
}

export interface AllocationResponse {
  readonly portfolioId: string
  readonly allocation: AllocationDto
}

export interface DividendsResponse {
  readonly portfolioId: string
  readonly dividends: DividendSectionDto
}

export interface WatchlistsResponse {
  readonly watchlists: readonly WatchlistDto[]
}

export interface MarketsResponse {
  readonly asOf: string
  readonly quotes: readonly MarketQuote[]
}

export interface HealthResponse {
  readonly status: 'ok'
  readonly environment: string
  readonly timestamp: string
}

export interface ApiErrorResponse {
  readonly error: {
    readonly code: string
    readonly message: string
    readonly details?: Record<string, unknown>
  }
}
