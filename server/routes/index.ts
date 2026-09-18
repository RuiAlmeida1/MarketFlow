import { Router } from '../http/router'
import { getDashboard } from './dashboard'
import { healthHandler } from './health'
import {
  getAllocation,
  getDividends,
  getHoldings,
  getPerformance,
  getPortfolio,
  getTransactions,
  listPortfolios,
} from './portfolios'
import { getMarkets, getMe, listWatchlists, searchAssets } from './reference'

export function createRouter(): Router {
  const router = new Router()

  router.get('/api/health', healthHandler)
  router.get('/api/dashboard', getDashboard)
  router.get('/api/me', getMe)

  router.get('/api/portfolios', listPortfolios)
  router.get('/api/portfolios/:id', getPortfolio)
  router.get('/api/portfolios/:id/holdings', getHoldings)
  router.get('/api/portfolios/:id/transactions', getTransactions)
  router.get('/api/portfolios/:id/dividends', getDividends)
  router.get('/api/portfolios/:id/performance', getPerformance)
  router.get('/api/portfolios/:id/allocation', getAllocation)

  router.get('/api/watchlists', listWatchlists)
  router.get('/api/markets', getMarkets)
  router.get('/api/assets/search', searchAssets)

  return router
}
