import type {
  DividendSectionDto,
  MonthlyDividendIncomeDto,
  UpcomingDividendDto,
} from '../../shared/api/contracts'
import {
  type CurrencyCode,
  type DividendPayment,
  type FxResolver,
  type Portfolio,
  calculateDividendIncome,
  sumMoney,
} from '../../shared/domain'
import { convertWithResolver } from '../../shared/domain/fx/convert'
import { toDateKey, todayUtc } from '../../shared/utils/date'
import type { AssetRepository } from '../repositories/asset-repository'
import type { DividendRepository } from '../repositories/dividend-repository'

export class DividendService {
  constructor(
    private readonly dividends: DividendRepository,
    private readonly assets: AssetRepository,
  ) {}

  async buildSection(
    portfolio: Portfolio,
    fx: FxResolver,
    today: Date = todayUtc(),
  ): Promise<DividendSectionDto> {
    const year = today.getUTCFullYear()
    const [payments, upcoming] = await Promise.all([
      this.dividends.listByPortfolio(portfolio.id),
      this.dividends.listUpcoming(portfolio.id, toDateKey(today)),
    ])

    const monthly = calculateDividendIncome(
      payments,
      year,
      portfolio.baseCurrency,
      fx,
    )
    const upcomingDtos = await this.buildUpcoming(upcoming, portfolio.baseCurrency, fx)

    return {
      year,
      monthly,
      annualIncome: sumMoney(
        monthly.map((entry) => entry.total),
        portfolio.baseCurrency,
      ),
      receivedIncome: sumMoney(
        monthly.map((entry) => entry.received),
        portfolio.baseCurrency,
      ),
      projectedIncome: sumMoney(
        monthly.map((entry) => entry.projected),
        portfolio.baseCurrency,
      ),
      upcoming: upcomingDtos,
    }
  }

  private async buildUpcoming(
    payments: readonly DividendPayment[],
    baseCurrency: CurrencyCode,
    fx: FxResolver,
  ): Promise<UpcomingDividendDto[]> {
    const assetIds = [...new Set(payments.map((payment) => payment.assetId))]
    const assetMap = await this.assets.findManyByIds(assetIds)

    const result: UpcomingDividendDto[] = []
    for (const payment of payments) {
      const asset = assetMap.get(payment.assetId)
      if (!asset) continue
      result.push({
        id: payment.id,
        asset,
        exDate: payment.exDate,
        paymentDate: payment.paymentDate,
        shares: payment.shares,
        dividendPerShare: payment.dividendPerShare,
        estimatedIncome: convertWithResolver(
          payment.amountNet,
          baseCurrency,
          fx,
          payment.paymentDate ?? payment.exDate,
        ).value,
        status: payment.status,
      })
    }
    return result
  }
}

export type { MonthlyDividendIncomeDto }
