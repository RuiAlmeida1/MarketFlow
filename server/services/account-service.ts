import type { User } from '../../shared/domain'
import { DatabaseError } from '../../shared/domain/errors'
import type { UserRepository } from '../repositories/user-repository'

/**
 * Maps authenticated identities (e.g. a Cloudflare Access email) to persisted
 * users. On first login a user and a default portfolio are provisioned.
 */
export class AccountService {
  constructor(
    private readonly db: D1Database,
    private readonly users: UserRepository,
  ) {}

  async resolveForEmail(email: string, displayName: string): Promise<User> {
    const normalized = email.trim().toLowerCase()
    const existing = await this.users.findByEmail(normalized)
    if (existing) return existing
    return this.provision(normalized, displayName)
  }

  private async provision(email: string, displayName: string): Promise<User> {
    const userId = crypto.randomUUID()
    const portfolioId = crypto.randomUUID()
    const now = new Date().toISOString()

    try {
      await this.db.batch([
        this.db
          .prepare(
            `INSERT INTO users (id, email, display_name, base_currency, created_at, updated_at)
             VALUES (?, ?, ?, 'EUR', ?, ?)`,
          )
          .bind(userId, email, displayName, now, now),
        this.db
          .prepare(
            `INSERT INTO portfolios
               (id, user_id, name, description, base_currency, is_default, created_at, updated_at)
             VALUES (?, ?, 'Main Portfolio', NULL, 'EUR', 1, ?, ?)`,
          )
          .bind(portfolioId, userId, now, now),
      ])
    } catch (error) {
      console.error('[accounts] provisioning failed', error)
      throw new DatabaseError()
    }

    const user = await this.users.findById(userId)
    if (!user) throw new DatabaseError()
    return user
  }
}
