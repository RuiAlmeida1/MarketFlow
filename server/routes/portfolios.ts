import type {
  AllocationResponse,
  BackfillResponse,
  DividendsResponse,
  HoldingsResponse,
  PerformanceResponse,
  PortfolioListResponse,
  SyncResponse,
  TransactionsResponse,
} from '../../shared/api/contracts'
import type { Portfolio } from '../../shared/domain'
import { type RouteHandler, requireParam } from '../http/context'
import { jsonResponse } from '../http/response'
import { buildAllocation, buildHoldings } from '../services/valuation-service'
import {
  allocationQuerySchema,
  parseQuery,
  performanceQuerySchema,
} from '../validation/params'

export const listPortfolios: RouteHandler = async (context) => {
  const userId = await context.getUserId()
  const portfolios = await context.services.portfolios.list(userId)
  const body: PortfolioListResponse = { portfolios }
  return jsonResponse(body)
}

export const getPortfolio: RouteHandler = async (context) => {
  const userId = await context.getUserId()
  const portfolio = await context.services.portfolios.requireOwned(
    userId,
    requireParam(context, 'id'),
  )
  const body: { portfolio: Portfolio } = { portfolio }
  return jsonResponse(body)
}

export const getHoldings: RouteHandler = async (context) => {
  const userId = await context.getUserId()
  const portfolioContext = await context.services.portfolios.loadContext(
    userId,
    requireParam(context, 'id'),
  )
  const body: HoldingsResponse = {
    portfolioId: portfolioContext.portfolio.id,
    holdings: buildHoldings(portfolioContext),
  }
  return jsonResponse(body)
}

export const getTransactions: RouteHandler = async (context) => {
  const userId = await context.getUserId()
  const portfolio = await context.services.portfolios.requireOwned(
    userId,
    requireParam(context, 'id'),
  )
  const transactions = await context.services.transactions.listByPortfolio(portfolio.id)
  const assetIds = [
    ...new Set(
      transactions
        .map((transaction) => transaction.assetId)
        .filter((id): id is string => id !== null),
    ),
  ]
  const assetMap = await context.services.assets.findManyByIds(assetIds)
  const body: TransactionsResponse = {
    portfolioId: portfolio.id,
    transactions,
    assets: [...assetMap.values()],
  }
  return jsonResponse(body)
}

export const getDividends: RouteHandler = async (context) => {
  const userId = await context.getUserId()
  const portfolioContext = await context.services.portfolios.loadContext(
    userId,
    requireParam(context, 'id'),
  )
  const dividends = await context.services.dividends.buildSection(
    portfolioContext.portfolio,
    portfolioContext.fx,
  )
  const body: DividendsResponse = { portfolioId: portfolioContext.portfolio.id, dividends }
  return jsonResponse(body)
}

export const getPerformance: RouteHandler = async (context) => {
  const userId = await context.getUserId()
  const { period } = parseQuery(performanceQuerySchema, context.url)
  const portfolioContext = await context.services.portfolios.loadContext(
    userId,
    requireParam(context, 'id'),
  )
  const performance = await context.services.performance.buildSeries(
    portfolioContext,
    period ?? '1Y',
  )
  const body: PerformanceResponse = { portfolioId: portfolioContext.portfolio.id, performance }
  return jsonResponse(body)
}

export const getAllocation: RouteHandler = async (context) => {
  const userId = await context.getUserId()
  const { dimension } = parseQuery(allocationQuerySchema, context.url)
  const resolvedDimension = dimension ?? 'sector'
  const portfolioContext = await context.services.portfolios.loadContext(
    userId,
    requireParam(context, 'id'),
  )
  const body: AllocationResponse = {
    portfolioId: portfolioContext.portfolio.id,
    allocation: {
      dimension: resolvedDimension,
      slices: buildAllocation(portfolioContext, resolvedDimension),
    },
  }
  return jsonResponse(body)
}

/**
 * Rebuilds holdings from transactions and refreshes live prices for tracked
 * assets. Safe to call repeatedly (idempotent projection + upserted prices).
 */
export const syncPortfolio: RouteHandler = async (context) => {
  const userId = await context.getUserId()
  const portfolio = await context.services.portfolios.requireOwned(
    userId,
    requireParam(context, 'id'),
  )
  const result = await context.services.sync.syncPortfolio(portfolio.id)
  const body: SyncResponse = {
    portfolioId: portfolio.id,
    positions: result.positions,
    realizedGains: result.realizedGains,
    prices: result.prices,
  }
  return jsonResponse(body)
}

/**
 * Reconstructs daily performance snapshots from historical prices so the chart
 * has history from the first transaction.
 */
export const backfillPerformance: RouteHandler = async (context) => {
  const userId = await context.getUserId()
  const portfolio = await context.services.portfolios.requireOwned(
    userId,
    requireParam(context, 'id'),
  )
  const result = await context.services.backfill.backfill(portfolio)
  const body: BackfillResponse = { days: result.days }
  return jsonResponse(body)
}
