import { FileSpreadsheet, TriangleAlert, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import type { ImportParseResult } from '@shared/import/xtb'
import { parseXtbWorkbook } from '@shared/import/xtb'
import { fromMajor } from '@shared/domain'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useSelectedPortfolio } from '@/hooks/use-selected-portfolio'
import { ApiClientError, api } from '@/lib/api-client'
import { invalidate } from '@/lib/query-cache'
import { formatDate, formatMoney, formatQuantity } from '@/lib/format'

type ImportMode = 'replace' | 'append'

const MODE_OPTIONS = [
  { value: 'replace' as const, label: 'Replace portfolio' },
  { value: 'append' as const, label: 'Add to portfolio' },
]

const PREVIEW_LIMIT = 50

function sheetRows(workbook: XLSX.WorkBook, name: string): unknown[][] {
  const sheet = workbook.Sheets[name]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
  }) as unknown[][]
}

async function parseWorkbook(file: File): Promise<ImportParseResult> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  return parseXtbWorkbook({
    closedPositions: sheetRows(workbook, 'Closed Positions'),
    cashOperations: sheetRows(workbook, 'Cash Operations'),
    openPositions: sheetRows(workbook, 'Open Positions'),
  })
}

export function ImportPage() {
  const { portfolio } = useSelectedPortfolio()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null)
  const [mode, setMode] = useState<ImportMode>('replace')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setSuccess(null)
    setParseResult(null)
    setFileName(file.name)
    try {
      setParseResult(await parseWorkbook(file))
    } catch (caught) {
      console.error('[import] parse failed', caught)
      setError('Não foi possível ler o ficheiro. Exporta novamente da XTB em .xlsx.')
    }
  }

  const handleImport = async () => {
    if (!portfolio || !parseResult) return
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await api.importTransactions(portfolio.id, {
        mode,
        transactions: parseResult.transactions.map((transaction) => ({
          symbol: transaction.symbol,
          exchange: transaction.exchange,
          transactionType: transaction.transactionType,
          quantity: transaction.quantity,
          price: transaction.price,
          fees: transaction.fees,
          taxes: transaction.taxes,
          currency: transaction.currency,
          exchangeRate: transaction.exchangeRate,
          transactionDate: transaction.transactionDate,
          notes: transaction.notes,
        })),
      })
      invalidate(/^(transactions|holdings|dashboard|performance|allocation)/)
      // Refresh live prices so the dashboard shows values immediately.
      try {
        await api.syncPortfolio(portfolio.id)
      } catch (syncError) {
        console.error('[import] post-import price sync failed', syncError)
      }
      // Reconstruct historical performance from the imported transactions.
      try {
        await api.backfillPerformance(portfolio.id)
      } catch (backfillError) {
        console.error('[import] performance backfill failed', backfillError)
      }
      invalidate(/^(markets|dashboard|holdings|performance)/)
      setSuccess(
        `${result.inserted} transações importadas (${mode === 'replace' ? 'substituição' : 'adição'}).`,
      )
      setParseResult(null)
      setFileName(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (caught) {
      console.error('[import] failed', caught)
      setError(
        caught instanceof ApiClientError
          ? caught.message
          : 'Falha ao importar as transações.',
      )
    } finally {
      setBusy(false)
    }
  }

  const preview = parseResult?.transactions.slice(0, PREVIEW_LIMIT) ?? []

  return (
    <div className="space-y-4">
      <SectionCard
        title="Importar da XTB"
        description="Exporta o histórico em .xlsx e carrega-o aqui. Nada é gravado até confirmares."
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="sr-only"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Escolher ficheiro
          </Button>
          {fileName ? (
            <span className="flex items-center gap-2 text-sm text-muted">
              <FileSpreadsheet className="h-4 w-4 text-subtle" aria-hidden="true" />
              {fileName}
            </span>
          ) : (
            <span className="text-sm text-subtle">Nenhum ficheiro selecionado</span>
          )}
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-negative">
            {error}
          </p>
        ) : null}
        {success ? (
          <p role="status" className="mt-4 text-sm text-positive">
            {success}
          </p>
        ) : null}
      </SectionCard>

      {parseResult ? (
        <>
          <SectionCard title="Pré-visualização" description="Resumo do que será importado">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted">Trades</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {parseResult.counts.trades}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted">Eventos de caixa</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {parseResult.counts.cash}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted">Ignorados</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {parseResult.counts.skipped}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted">Total</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {parseResult.transactions.length}
                </p>
              </div>
            </div>

            {parseResult.warnings.length > 0 ? (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft p-3 text-xs text-warning">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-medium">Avisos de mapeamento</p>
                  <ul className="mt-1 list-disc pl-4">
                    {parseResult.warnings.slice(0, 6).map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-muted">Modo de importação</p>
              <SegmentedControl
                options={MODE_OPTIONS}
                value={mode}
                onChange={setMode}
                ariaLabel="Import mode"
                size="md"
              />
              <p className="mt-2 text-xs text-subtle">
                {mode === 'replace'
                  ? 'As transações e holdings atuais deste portfólio serão substituídas.'
                  : 'As transações serão adicionadas às existentes.'}
              </p>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Button
                variant="primary"
                onClick={() => void handleImport()}
                disabled={busy || !portfolio || parseResult.transactions.length === 0}
              >
                {busy ? 'A importar…' : `Importar ${parseResult.transactions.length} transações`}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setParseResult(null)
                  setFileName(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                disabled={busy}
              >
                Cancelar
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="Transações detetadas"
            description={`A mostrar ${preview.length} de ${parseResult.transactions.length}`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th scope="col" className="pb-2 font-medium">Data</th>
                    <th scope="col" className="pb-2 font-medium">Tipo</th>
                    <th scope="col" className="pb-2 font-medium">Símbolo</th>
                    <th scope="col" className="pb-2 text-right font-medium">Qtd</th>
                    <th scope="col" className="pb-2 text-right font-medium">Preço</th>
                    <th scope="col" className="pb-2 font-medium">Moeda</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((transaction, index) => (
                    <tr
                      key={`${transaction.symbol}-${transaction.transactionDate}-${index}`}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="py-2 whitespace-nowrap text-muted">
                        {formatDate(transaction.transactionDate, { dateStyle: 'medium' })}
                      </td>
                      <td className="py-2">
                        <Badge variant="neutral">{transaction.transactionType}</Badge>
                      </td>
                      <td className="py-2 font-medium text-foreground">
                        {transaction.symbol || '—'}
                      </td>
                      <td className="py-2 text-right tabular-nums text-foreground">
                        {transaction.quantity ? formatQuantity(transaction.quantity) : '—'}
                      </td>
                      <td className="py-2 text-right tabular-nums text-foreground">
                        {formatMoney(fromMajor(transaction.price, transaction.currency))}
                      </td>
                      <td className="py-2 text-muted">{transaction.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface surface-shadow">
          <EmptyState
            icon={FileSpreadsheet}
            title="Sem ficheiro carregado"
            description="Seleciona um export .xlsx da XTB para veres a pré-visualização antes de importar."
          />
        </div>
      )}
    </div>
  )
}
