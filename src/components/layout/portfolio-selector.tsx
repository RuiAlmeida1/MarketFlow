import { Wallet } from 'lucide-react'
import { useId } from 'react'
import { usePortfolioSelection } from '@/app/portfolio-context'
import { useApiQuery } from '@/hooks/use-api-query'
import { api } from '@/lib/api-client'

export function PortfolioSelector() {
  const { selectedPortfolioId, setSelectedPortfolioId } = usePortfolioSelection()
  const selectId = useId()
  const { data } = useApiQuery('portfolios', () => api.portfolios())
  const portfolios = data?.portfolios ?? []
  const selected = portfolios.find((portfolio) => portfolio.id === selectedPortfolioId)

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5">
      <Wallet className="h-4 w-4 text-subtle" aria-hidden="true" />
      <label htmlFor={selectId} className="sr-only">
        Select portfolio
      </label>
      <select
        id={selectId}
        value={selectedPortfolioId ?? 'all'}
        onChange={(event) =>
          setSelectedPortfolioId(event.target.value === 'all' ? null : event.target.value)
        }
        className="max-w-[10rem] cursor-pointer appearance-none bg-transparent pr-1 text-sm font-medium text-foreground outline-none"
      >
        <option value="all">All portfolios</option>
        {portfolios.map((portfolio) => (
          <option key={portfolio.id} value={portfolio.id}>
            {portfolio.name}
          </option>
        ))}
      </select>
      {selected ? (
        <span className="text-xs text-subtle">{selected.baseCurrency}</span>
      ) : null}
    </div>
  )
}
