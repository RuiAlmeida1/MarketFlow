/** UTC date helpers shared by the Worker and the client. Dates are ISO keys. */

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function todayUtc(): Date {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime())
  next.setUTCMonth(next.getUTCMonth() + months)
  return next
}

export function addYears(date: Date, years: number): Date {
  const next = new Date(date.getTime())
  next.setUTCFullYear(next.getUTCFullYear() + years)
  return next
}

export function startOfYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
}

export function parseDateKey(value: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return parsed
}
