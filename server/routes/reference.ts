import type {
  MarketsResponse,
  MeResponse,
  WatchlistsResponse,
} from '../../shared/api/contracts'
import { NotFoundError } from '../../shared/domain/errors'
import type { RouteHandler } from '../http/context'
import { jsonResponse } from '../http/response'
import { parseQuery, searchQuerySchema } from '../validation/params'

export const getMe: RouteHandler = async (context) => {
  const userId = await context.getUserId()
  const user = await context.services.users.findById(userId)
  if (!user) throw new NotFoundError('User', userId)
  const body: MeResponse = { user }
  return jsonResponse(body)
}

export const listWatchlists: RouteHandler = async (context) => {
  const userId = await context.getUserId()
  const watchlists = await context.services.watchlists.listByUser(userId)
  const body: WatchlistsResponse = { watchlists }
  return jsonResponse(body)
}

export const getMarkets: RouteHandler = async (context) => {
  const markets: MarketsResponse = await context.services.markets.getOverview()
  return jsonResponse(markets)
}

export const searchAssets: RouteHandler = async (context) => {
  const { q } = parseQuery(searchQuerySchema, context.url)
  const assets = await context.services.assets.search(q)
  return jsonResponse({ assets })
}
