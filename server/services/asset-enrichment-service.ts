import { sectorFromIndustry } from '../../shared/domain'
import type { CompanyProfileProvider } from '../../shared/domain'
import type { AssetRepository } from '../repositories/asset-repository'
import type { HoldingRepository } from '../repositories/holding-repository'

export interface EnrichmentResult {
  readonly updated: number
  readonly skipped: number
}

/**
 * Enriches tracked assets with company reference data (name, sector, industry,
 * country) from the configured provider. Assets that already have a sector are
 * skipped, so this is cheap to run on every sync.
 */
export class AssetEnrichmentService {
  constructor(
    private readonly provider: CompanyProfileProvider | null,
    private readonly assets: AssetRepository,
    private readonly holdings: HoldingRepository,
  ) {}

  async enrichTrackedAssets(): Promise<EnrichmentResult> {
    if (!this.provider) return { updated: 0, skipped: 0 }

    const assetIds = await this.holdings.listDistinctAssetIds()
    if (assetIds.length === 0) return { updated: 0, skipped: 0 }

    const assetMap = await this.assets.findManyByIds(assetIds)
    let updated = 0
    let skipped = 0

    for (const asset of assetMap.values()) {
      if (asset.sector && asset.name !== asset.symbol) {
        continue
      }
      try {
        const profile = await this.provider.getCompanyProfile(asset.symbol)
        if (!profile) {
          skipped += 1
          continue
        }
        await this.assets.updateMetadata(asset.id, {
          name: profile.name,
          sector: sectorFromIndustry(profile.industry),
          industry: profile.industry,
          country: profile.country,
        })
        updated += 1
      } catch (error) {
        skipped += 1
        console.warn('[enrich] profile failed', { symbol: asset.symbol, error })
      }
    }

    return { updated, skipped }
  }
}
