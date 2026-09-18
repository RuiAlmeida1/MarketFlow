import type { WatchlistDto, WatchlistItemDto } from '../../shared/api/contracts'
import { calculateValueChange } from '../../shared/domain'
import type { AssetRepository } from '../repositories/asset-repository'
import type { PriceRepository } from '../repositories/price-repository'
import type { WatchlistRepository } from '../repositories/watchlist-repository'

export class WatchlistService {
  constructor(
    private readonly watchlists: WatchlistRepository,
    private readonly assets: AssetRepository,
    private readonly prices: PriceRepository,
  ) {}

  async listByUser(userId: string): Promise<WatchlistDto[]> {
    const lists = await this.watchlists.listByUser(userId)
    if (lists.length === 0) return []

    const items = await this.watchlists.listItemsByWatchlistIds(
      lists.map((list) => list.id),
    )
    const assetIds = [...new Set(items.map((item) => item.assetId))]

    const [assetMap, priceMap] = await Promise.all([
      this.assets.findManyByIds(assetIds),
      this.prices.latestAndPrevious(assetIds),
    ])

    return lists.map((list) => ({
      id: list.id,
      name: list.name,
      isDefault: list.isDefault,
      items: items
        .filter((item) => item.watchlistId === list.id)
        .flatMap((item): WatchlistItemDto[] => {
          const asset = assetMap.get(item.assetId)
          if (!asset) return []
          const pair = priceMap.get(item.assetId)
          const latest = pair?.latest?.price ?? null
          const previous = pair?.previous?.price ?? null
          return [
            {
              id: item.id,
              asset,
              lastPrice: latest,
              previousPrice: previous,
              dailyChange:
                latest && previous ? calculateValueChange(latest, previous) : null,
              targetPrice: item.targetPrice,
              targetCurrency: item.targetCurrency,
              notes: item.notes,
            },
          ]
        }),
    }))
  }
}
