import type { CurrencyCode } from '../domain/money/currency'
import type { TransactionType } from '../domain/transactions/transaction'

/**
 * Normalized transaction produced by a broker import. Prices/fees are in major
 * units of the instrument currency; the server converts to minor units.
 */
export interface ImportedTransaction {
  readonly symbol: string | null
  readonly exchange: string | null
  readonly country: string | null
  readonly transactionType: TransactionType
  readonly quantity: number
  readonly price: number
  readonly fees: number
  readonly taxes: number
  readonly currency: CurrencyCode
  readonly exchangeRate: number
  readonly transactionDate: string
  readonly notes: string | null
}

export interface ImportCounts {
  readonly trades: number
  readonly cash: number
  readonly skipped: number
}

export interface ImportParseResult {
  readonly transactions: readonly ImportedTransaction[]
  readonly warnings: readonly string[]
  readonly counts: ImportCounts
}

export type SheetRows = readonly (readonly unknown[])[]

export interface XtbWorkbookRows {
  readonly closedPositions: SheetRows
  readonly cashOperations: SheetRows
  readonly openPositions: SheetRows
}

const SETTLEMENT_CURRENCY: CurrencyCode = 'EUR'

const TICKER_CURRENCY: Record<string, CurrencyCode> = {
  US: 'USD',
  DE: 'EUR',
  PT: 'EUR',
  FR: 'EUR',
  NL: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  BE: 'EUR',
  FI: 'EUR',
  IE: 'EUR',
  UK: 'GBP',
  L: 'GBP',
  CH: 'CHF',
  CA: 'CAD',
  AU: 'AUD',
  JP: 'JPY',
  HK: 'HKD',
}

const TICKER_EXCHANGE: Record<string, string> = {
  US: 'US',
  DE: 'XETRA',
  PT: 'EURONEXT',
  FR: 'EURONEXT',
  NL: 'EURONEXT',
  ES: 'BME',
  IT: 'BORSA_ITALIANA',
  BE: 'EURONEXT',
  FI: 'NASDAQ_HELSINKI',
  IE: 'EURONEXT',
  UK: 'LSE',
  L: 'LSE',
  CH: 'SIX',
  CA: 'TSX',
  AU: 'ASX',
  JP: 'TSE',
  HK: 'HKEX',
}

const TICKER_COUNTRY: Record<string, string> = {
  US: 'US',
  DE: 'DE',
  PT: 'PT',
  FR: 'FR',
  NL: 'NL',
  ES: 'ES',
  IT: 'IT',
  BE: 'BE',
  FI: 'FI',
  IE: 'IE',
  UK: 'GB',
  L: 'GB',
  CH: 'CH',
  CA: 'CA',
  AU: 'AU',
  JP: 'JP',
  HK: 'HK',
}

const CASH_TYPE_MAP: Record<string, TransactionType> = {
  Deposit: 'DEPOSIT',
  Withdrawal: 'WITHDRAWAL',
  Dividend: 'DIVIDEND',
  'Withholding tax': 'TAX',
  'Free funds interest': 'INTEREST',
  'Free funds interest tax': 'TAX',
  'SEC fee': 'FEE',
  Commission: 'FEE',
  'Cashback eWallet': 'OTHER',
  Correction: 'OTHER',
}

/** Cash-operation types that duplicate trades and must not be imported twice. */
const CASH_SKIP_TYPES = new Set(['Stock purchase', 'Stock sell', 'Total'])

export function currencyFromTicker(ticker: string): CurrencyCode {
  const suffix = ticker.trim().toUpperCase().split('.').pop() ?? ''
  return TICKER_CURRENCY[suffix] ?? SETTLEMENT_CURRENCY
}

export function exchangeFromTicker(ticker: string): string | null {
  const suffix = ticker.trim().toUpperCase().split('.').pop() ?? ''
  return TICKER_EXCHANGE[suffix] ?? null
}

export function countryFromTicker(ticker: string): string | null {
  const suffix = ticker.trim().toUpperCase().split('.').pop() ?? ''
  return TICKER_COUNTRY[suffix] ?? null
}

/** Ticker without the XTB exchange suffix (`O.US` -> `O`). */
export function symbolFromTicker(ticker: string): string {
  return ticker.trim().toUpperCase().split('.')[0] ?? ticker.trim().toUpperCase()
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0
  const normalized = value.replace(/\s/g, '').replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
}

function toDate(value: unknown): string | null {
  const text = toText(value)
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(text)
  return match?.[1] ?? null
}

interface Header {
  readonly index: number
  readonly columns: Record<string, number>
}

function findHeader(rows: SheetRows, required: readonly string[]): Header | null {
  for (let index = 0; index < Math.min(rows.length, 15); index += 1) {
    const row = rows[index]
    if (!row) continue
    const cells = row.map(toText)
    if (required.every((column) => cells.includes(column))) {
      const columns: Record<string, number> = {}
      cells.forEach((cell, cellIndex) => {
        if (cell) columns[cell] = cellIndex
      })
      return { index, columns }
    }
  }
  return null
}

function cell(row: readonly unknown[], column: number | undefined): string {
  if (column === undefined) return ''
  return toText(row[column])
}

function parseClosedPositions(rows: SheetRows): {
  transactions: ImportedTransaction[]
  skipped: number
} {
  const transactions: ImportedTransaction[] = []
  let skipped = 0
  const header = findHeader(rows, ['Ticker', 'Open Price', 'Close Price'])
  if (!header) return { transactions, skipped }

  for (const row of rows.slice(header.index + 1)) {
    const ticker = cell(row, header.columns['Ticker'])
    if (!ticker) continue

    const volume = toNumber(cell(row, header.columns['Volume']))
    const openPrice = toNumber(cell(row, header.columns['Open Price']))
    const closePrice = toNumber(cell(row, header.columns['Close Price']))
    const openDate = toDate(cell(row, header.columns['Open Time (UTC)']))
    const closeDate = toDate(cell(row, header.columns['Close Time (UTC)']))
    const commission = toNumber(cell(row, header.columns['Commission']))
    const openRate = toNumber(cell(row, header.columns['Open Conversion Rate'])) || 1
    const closeRate = toNumber(cell(row, header.columns['Close Conversion Rate'])) || 1
    const comment = cell(row, header.columns['Comment']) || null
    const currency = currencyFromTicker(ticker)
    const symbol = symbolFromTicker(ticker)

    if (volume <= 0 || openPrice <= 0 || !openDate) {
      skipped += 1
      continue
    }

    transactions.push({
      symbol,
      exchange: exchangeFromTicker(ticker),
      country: countryFromTicker(ticker),
      transactionType: 'BUY',
      quantity: volume,
      price: openPrice,
      fees: 0,
      taxes: 0,
      currency,
      exchangeRate: openRate,
      transactionDate: openDate,
      notes: comment ? `XTB open · ${comment}` : 'XTB open',
    })

    if (closePrice > 0 && closeDate) {
      transactions.push({
        symbol,
        exchange: exchangeFromTicker(ticker),
        country: countryFromTicker(ticker),
        transactionType: 'SELL',
        quantity: volume,
        price: closePrice,
        fees: commission,
        taxes: 0,
        currency,
        exchangeRate: closeRate,
        transactionDate: closeDate,
        notes: comment ? `XTB close · ${comment}` : 'XTB close',
      })
    }
  }

  return { transactions, skipped }
}

function parseOpenPositions(rows: SheetRows): {
  transactions: ImportedTransaction[]
  skipped: number
} {
  const transactions: ImportedTransaction[] = []
  let skipped = 0
  const header = findHeader(rows, ['Ticker', 'Open price', 'Open time (UTC)'])
  if (!header) return { transactions, skipped }

  for (const row of rows.slice(header.index + 1)) {
    const ticker = cell(row, header.columns['Ticker'])
    const type = cell(row, header.columns['Type']).toUpperCase()
    if (!ticker || type !== 'BUY') continue

    const volume = toNumber(cell(row, header.columns['Volume']))
    const openPrice = toNumber(cell(row, header.columns['Open price']))
    const openDate = toDate(cell(row, header.columns['Open time (UTC)']))
    if (volume <= 0 || openPrice <= 0 || !openDate) {
      skipped += 1
      continue
    }

    transactions.push({
      symbol: symbolFromTicker(ticker),
      exchange: exchangeFromTicker(ticker),
      country: countryFromTicker(ticker),
      transactionType: 'BUY',
      quantity: volume,
      price: openPrice,
      fees: 0,
      taxes: 0,
      currency: currencyFromTicker(ticker),
      exchangeRate: 1,
      transactionDate: openDate,
      notes: 'XTB open position',
    })
  }

  return { transactions, skipped }
}

function parseCashOperations(rows: SheetRows): {
  transactions: ImportedTransaction[]
  warnings: string[]
  skipped: number
} {
  const transactions: ImportedTransaction[] = []
  const warnings: string[] = []
  let skipped = 0
  const header = findHeader(rows, ['Type', 'Amount', 'Time'])
  if (!header) return { transactions, warnings, skipped }

  let transferCount = 0
  for (const row of rows.slice(header.index + 1)) {
    const type = cell(row, header.columns['Type'])
    if (!type) continue
    if (CASH_SKIP_TYPES.has(type)) continue

    let transactionType = CASH_TYPE_MAP[type]
    if (type === 'Transfer') {
      transferCount += 1
      transactionType = transferCount % 2 === 1 ? 'TRANSFER_IN' : 'TRANSFER_OUT'
    }
    if (!transactionType) {
      warnings.push(`Unmapped cash operation: ${type}`)
      skipped += 1
      continue
    }

    const amount = toNumber(cell(row, header.columns['Amount']))
    const date = toDate(cell(row, header.columns['Time']))
    if (amount === 0 || !date) {
      skipped += 1
      continue
    }

    const ticker = cell(row, header.columns['Ticker'])
    const comment = cell(row, header.columns['Comment']) || null

    transactions.push({
      symbol: ticker ? symbolFromTicker(ticker) : null,
      exchange: null,
      country: null,
      transactionType,
      quantity: 0,
      // Keep the signed amount: reversals (negative dividend) and refunds
      // (positive tax) must be preserved for correct net income.
      price: amount,
      fees: 0,
      taxes: 0,
      currency: SETTLEMENT_CURRENCY,
      exchangeRate: 1,
      transactionDate: date,
      notes: comment ? `${type} · ${comment}` : type,
    })
  }

  return { transactions, warnings, skipped }
}

/**
 * Maps an XTB workbook (as raw row arrays) into normalized transactions:
 * trades from Closed + Open positions and non-trade cash operations.
 */
export function parseXtbWorkbook(workbook: XtbWorkbookRows): ImportParseResult {
  const warnings: string[] = []
  const closed = parseClosedPositions(workbook.closedPositions)
  const open = parseOpenPositions(workbook.openPositions)
  const cash = parseCashOperations(workbook.cashOperations)

  warnings.push(...cash.warnings)

  const transactions = [...closed.transactions, ...open.transactions, ...cash.transactions]
  transactions.sort((a, b) => a.transactionDate.localeCompare(b.transactionDate))

  return {
    transactions,
    warnings,
    counts: {
      trades: closed.transactions.length + open.transactions.length,
      cash: cash.transactions.length,
      skipped: closed.skipped + open.skipped + cash.skipped,
    },
  }
}
