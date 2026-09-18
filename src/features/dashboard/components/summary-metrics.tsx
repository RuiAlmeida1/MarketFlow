import { Coins, Percent, TrendingUp, Wallet } from 'lucide-react'
import type { PortfolioSummaryDto } from '@shared/api/contracts'
import { MetricCard } from '@/components/ui/metric-card'
import {
  formatMoney,
  formatPercentage,
  formatSignedMoney,
  formatSignedPercentage,
  valueTone,
} from '@/lib/format'

export function SummaryMetrics({ summary }: { summary: PortfolioSummaryDto }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Total invested"
        value={formatMoney(summary.investedCapital)}
        hint="Cost basis of open positions"
        icon={Wallet}
      />
      <MetricCard
        label="Total return"
        value={formatSignedMoney(summary.unrealizedReturn)}
        secondary={formatSignedPercentage(summary.unrealizedReturnPercentage)}
        tone={valueTone(summary.unrealizedReturnPercentage)}
        icon={TrendingUp}
      />
      <MetricCard
        label="Annual dividends"
        value={formatMoney(summary.annualDividendIncome)}
        hint={`Net income in ${summary.baseCurrency}`}
        icon={Coins}
      />
      <MetricCard
        label="Portfolio yield"
        value={formatPercentage(summary.portfolioYield)}
        hint="Annual income / market value"
        icon={Percent}
      />
    </div>
  )
}
