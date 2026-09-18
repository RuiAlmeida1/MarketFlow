import { LifeBuoy } from 'lucide-react'
import { SectionCard } from '@/components/ui/card'

const FAQ = [
  {
    question: 'How is portfolio value calculated?',
    answer:
      'Each open position is valued as quantity × last known price, then converted to your portfolio base currency using stored FX rates. All arithmetic is performed on integer minor units to avoid floating point errors.',
  },
  {
    question: 'Where does market data come from in this phase?',
    answer:
      'Phase 1 uses realistic development data. The MarketDataProvider port is already in place, so a live vendor can be connected later without touching the UI.',
  },
  {
    question: 'Why do some sections show a dash?',
    answer:
      'When a price or FX rate is unavailable, MarketFlow deliberately shows a gap instead of fabricating a value. Missing data is tracked per section.',
  },
  {
    question: 'Are transactions the source of truth?',
    answer:
      'Yes. Holdings are a projection that can always be rebuilt by replaying transactions. Importing and cost-basis automation arrive in a later phase.',
  },
] as const

export function HelpPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-5 surface-shadow">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <LifeBuoy className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Help centre</h2>
          <p className="text-sm text-muted">
            How MarketFlow computes and displays your portfolio.
          </p>
        </div>
      </div>

      <SectionCard title="Frequently asked questions">
        <dl className="space-y-4">
          {FAQ.map((entry) => (
            <div key={entry.question}>
              <dt className="text-sm font-medium text-foreground">{entry.question}</dt>
              <dd className="mt-1 text-sm text-muted">{entry.answer}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>
    </div>
  )
}
