import { Router } from '../http/router'
import { loginHandler, logoutHandler, sessionHandler } from './auth'
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
  syncPortfolio,
} from './portfolios'
import { getMarkets, getMe, listWatchlists, searchAssets } from './reference'

export function createRouter(): Router {
  const router = new Router()

  router.get('/api/health', healthHandler)
  router.get('/api/dashboard', getDashboard)
  router.get('/api/me', getMe)

  router.post('/api/auth/login', loginHandler)
  router.post('/api/auth/logout', logoutHandler)
  router.get('/api/auth/session', sessionHandler)

  router.get('/api/portfolios', listPortfolios)
  router.get('/api/portfolios/:id', getPortfolio)
  router.get('/api/portfolios/:id/holdings', getHoldings)
  router.get('/api/portfolios/:id/transactions', getTransactions)
  router.get('/api/portfolios/:id/dividends', getDividends)
  router.get('/api/portfolios/:id/performance', getPerformance)
  router.get('/api/portfolios/:id/allocation', getAllocation)
  router.post('/api/portfolios/:id/sync', syncPortfolio)

  router.get('/api/watchlists', listWatchlists)
  router.get('/api/markets', getMarkets)
  router.get('/api/assets/search', searchAssets)

  return router
}
