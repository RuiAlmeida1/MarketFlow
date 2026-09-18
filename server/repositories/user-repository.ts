import type { User } from '../../shared/domain'
import { queryFirst } from '../db/client'
import { mapUser } from '../db/mappers'
import type { UserRow } from '../db/rows'

export class UserRepository {
  constructor(private readonly db: D1Database) {}

  async findById(id: string): Promise<User | null> {
    const row = await queryFirst<UserRow>(
      this.db,
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [id],
    )
    return row ? mapUser(row) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await queryFirst<UserRow>(
      this.db,
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()],
    )
    return row ? mapUser(row) : null
  }

  async findFirst(): Promise<User | null> {
    const row = await queryFirst<UserRow>(
      this.db,
      'SELECT * FROM users ORDER BY created_at ASC LIMIT 1',
    )
    return row ? mapUser(row) : null
  }
}
