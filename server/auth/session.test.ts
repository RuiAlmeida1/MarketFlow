import { describe, expect, it } from 'vitest'
import { createSessionToken, verifySessionToken } from './session'

const SECRET = 'test-session-secret'

function base64Url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('session tokens', () => {
  it('round-trips a valid token', async () => {
    const token = await createSessionToken('user-1', SECRET)
    await expect(verifySessionToken(token, SECRET)).resolves.toEqual({ userId: 'user-1' })
  })

  it('rejects a token signed with a different secret', async () => {
    const token = await createSessionToken('user-1', SECRET)
    await expect(verifySessionToken(token, 'another-secret')).resolves.toBeNull()
  })

  it('rejects expired tokens', async () => {
    const token = await createSessionToken('user-1', SECRET, 1_000, Date.now() - 10_000)
    await expect(verifySessionToken(token, SECRET)).resolves.toBeNull()
  })

  it('rejects a tampered payload (forged user)', async () => {
    const token = await createSessionToken('user-1', SECRET)
    const parts = token.split('.')
    const forgedPayload = base64Url(
      JSON.stringify({ sub: 'admin', iat: Date.now(), exp: Date.now() + 1_000_000 }),
    )
    const forged = `${parts[0]}.${forgedPayload}.${parts[2]}`
    await expect(verifySessionToken(forged, SECRET)).resolves.toBeNull()
  })

  it('rejects malformed tokens', async () => {
    await expect(verifySessionToken('not-a-token', SECRET)).resolves.toBeNull()
    await expect(verifySessionToken('v1.only-two', SECRET)).resolves.toBeNull()
  })
})
