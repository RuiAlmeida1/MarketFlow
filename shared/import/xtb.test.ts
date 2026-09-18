import { describe, expect, it } from 'vitest'
import {
  currencyFromTicker,
  parseXtbWorkbook,
  symbolFromTicker,
  type SheetRows,
} from './xtb'

const CLOSED_HEADER = [
  'Instrument', 'Ticker', 'Category', 'Type', 'Volume', 'Open Price', 'Open Time (UTC)',
  'Close Price', 'Close Time (UTC)', 'Product', 'Profit/Loss', 'Gross Profit',
  'Purchase Value', 'Sale Value', 'Stop Loss', 'Take Profit', 'Commission', 'Margin',
  'Swap', 'Rollover', 'Open Conversion Rate', 'Close Conversion Rate', 'Close Origin',
  'Position ID', 'Comment',
]

const closedRows: SheetRows = [
  CLOSED_HEADER,
  ['Altria', 'MO.US', 'STOCK', 'BUY', '2', '72.24', '2026-07-02 13:30:02', '68', '2026-08-24 18:06:07', 'My Trades', '-10.86', '-10.86', '126.93', '116.07', '', '', '0', '', '', '', '0.87856', '0.85345', 'iOS', '2672330960', ''],
]

const OPEN_HEADER = [
  'Product', 'Instrument/Position', 'Ticker', 'Category', 'Type', 'Volume', 'Value',
  'Current price', 'Open price', 'Open time (UTC)', 'Stop Loss', 'Take Profit',
  'Net Profit %', 'Net Profit', 'Gross Profit', 'Margin', 'Open Commission', 'Swap', 'Rollover',
]

const openRows: SheetRows = [
  OPEN_HEADER,
  ['My Trades', 'Realty', 'O.US', 'STOCK', '', '10', '497.23', '', '63.39', '', '', '', '-8.45', '-45.91', '-45.91', '', '', '', ''],
  ['My Trades', '2401451283', 'O.US', '', 'BUY', '5', '248.62', '57.29', '67.42', '2026-02-27 15:05:25', '', '', '-13.38', '-38.42', '-38.42', '', '', '', ''],
]

const CASH_HEADER = ['Type', 'Instrument', 'Ticker', 'Category', 'Time', 'Amount', 'ID', 'Comment', 'Product', 'Position ID']

const cashRows: SheetRows = [
  ['Account number', '2308316'],
  CASH_HEADER,
  ['Withholding tax', "McDonald's", 'MCD.US', 'STOCK', '2026-09-16 09:54:43', '-0.24', '1', 'MCD.US USD WHT 15%', 'My Trades', ''],
  ['Dividend', "McDonald's", 'MCD.US', 'STOCK', '2026-09-16 09:54:43', '1.6', '2', 'MCD.US USD 1.86/ SHR', 'My Trades', ''],
  ['Stock purchase', 'Rheinmetall', 'RHM.DE', 'STOCK', '2026-09-09 13:43:15', '-5.22', '3', 'OPEN BUY 0.0052 @ 1003.40', 'My Trades', ''],
  ['Deposit', '', '', '', '2026-09-07 19:15:02', '8.3', '4', 'deposit', 'My Trades', ''],
  ['Total', '', '', '', '', '0', '', '', '', ''],
]

describe('xtb helpers', () => {
  it('derives currency and symbol from an XTB ticker', () => {
    expect(currencyFromTicker('O.US')).toBe('USD')
    expect(currencyFromTicker('RHM.DE')).toBe('EUR')
    expect(currencyFromTicker('VOD.UK')).toBe('GBP')
    expect(currencyFromTicker('GALP.PT')).toBe('EUR')
    expect(currencyFromTicker('UNKNOWN')).toBe('EUR')
    expect(symbolFromTicker('O.US')).toBe('O')
    expect(symbolFromTicker('RHM.DE')).toBe('RHM')
  })
})

describe('parseXtbWorkbook', () => {
  it('parses closed positions into BUY and SELL transactions', () => {
    const result = parseXtbWorkbook({
      closedPositions: closedRows,
      openPositions: [],
      cashOperations: [],
    })
    const buy = result.transactions.find((t) => t.transactionType === 'BUY')
    const sell = result.transactions.find((t) => t.transactionType === 'SELL')
    expect(buy).toMatchObject({ symbol: 'MO', quantity: 2, price: 72.24, currency: 'USD', transactionDate: '2026-07-02' })
    expect(sell).toMatchObject({ symbol: 'MO', quantity: 2, price: 68, transactionDate: '2026-08-24' })
    expect(result.counts.trades).toBe(2)
  })

  it('parses only open lot rows (ignoring summary rows)', () => {
    const result = parseXtbWorkbook({
      closedPositions: [],
      openPositions: openRows,
      cashOperations: [],
    })
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0]).toMatchObject({
      symbol: 'O',
      transactionType: 'BUY',
      quantity: 5,
      price: 67.42,
      currency: 'USD',
      transactionDate: '2026-02-27',
    })
    expect(result.counts.trades).toBe(1)
  })

  it('maps cash operations and skips trade duplicates', () => {
    const result = parseXtbWorkbook({
      closedPositions: [],
      openPositions: [],
      cashOperations: cashRows,
    })
    const types = result.transactions.map((t) => t.transactionType).sort()
    expect(types).toEqual(['DEPOSIT', 'DIVIDEND', 'TAX'])
    const dividend = result.transactions.find((t) => t.transactionType === 'DIVIDEND')
    expect(dividend).toMatchObject({ symbol: 'MCD', price: 1.6, currency: 'EUR' })
    expect(result.counts.cash).toBe(3)
  })

  it('emits warnings for unmapped cash operations', () => {
    const result = parseXtbWorkbook({
      closedPositions: [],
      openPositions: [],
      cashOperations: [...cashRows, ['Crypto reward', '', '', '', '2026-09-01 00:00:00', '1', '9', '', '', '']],
    })
    expect(result.warnings.some((warning) => warning.includes('Crypto reward'))).toBe(true)
  })

  it('alternates transfers in and out', () => {
    const rows: SheetRows = [
      CASH_HEADER,
      ['Transfer', '', '', '', '2026-09-01 00:00:00', '100', '1', 'in', '', ''],
      ['Transfer', '', '', '', '2026-09-02 00:00:00', '-50', '2', 'out', '', ''],
    ]
    const result = parseXtbWorkbook({
      closedPositions: [],
      openPositions: [],
      cashOperations: rows,
    })
    expect(result.transactions.map((t) => t.transactionType)).toEqual([
      'TRANSFER_IN',
      'TRANSFER_OUT',
    ])
  })

  it('returns an empty result for empty sheets', () => {
    const result = parseXtbWorkbook({
      closedPositions: [],
      openPositions: [],
      cashOperations: [],
    })
    expect(result.transactions).toEqual([])
    expect(result.counts).toEqual({ trades: 0, cash: 0, skipped: 0 })
  })
})
