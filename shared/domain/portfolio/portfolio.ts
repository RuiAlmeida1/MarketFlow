import type { CurrencyCode } from '../money/currency'

export interface Portfolio {
  readonly id: string
  readonly userId: string
  readonly name: string
  readonly description: string | null
  readonly baseCurrency: CurrencyCode
  readonly isDefault: boolean
  readonly createdAt: string
  readonly updatedAt: string
}

export interface User {
  readonly id: string
  readonly email: string
  readonly displayName: string
  readonly baseCurrency: CurrencyCode
  readonly createdAt: string
  readonly updatedAt: string
}
