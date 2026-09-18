import { beforeAll, describe, expect, it } from 'vitest'
import { verifyAccessJwt } from './access-jwt'

const TEAM_DOMAIN = 'test.cloudflareaccess.com'
const AUD = 'aud-123'
const EMAIL = 'ruimiguelalmeida.090@gmail.com'

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function jsonBase64Url(value: unknown): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)))
}

let keyPair: CryptoKeyPair
type TestJwk = JsonWebKey & { kid?: string }
let publicJwk: TestJwk

beforeAll(async () => {
  keyPair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair
  publicJwk = (await crypto.subtle.exportKey('jwk', keyPair.publicKey)) as TestJwk
  publicJwk.kid = 'test-kid'
})

async function makeToken(
  claims: Record<string, unknown>,
  kid = 'test-kid',
): Promise<string> {
  const header = jsonBase64Url({ alg: 'RS256', kid, typ: 'JWT' })
  const payload = jsonBase64Url(claims)
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    keyPair.privateKey,
    new TextEncoder().encode(`${header}.${payload}`),
  )
  return `${header}.${payload}.${base64Url(new Uint8Array(signature))}`
}

const jwksFetcher = (async () =>
  new Response(JSON.stringify({ keys: [publicJwk] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })) as unknown as typeof fetch

function validClaims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: EMAIL,
    name: 'Rui Almeida',
    aud: AUD,
    iss: `https://${TEAM_DOMAIN}`,
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  }
}

const options = { teamDomain: TEAM_DOMAIN, aud: AUD, fetcher: jwksFetcher }

describe('verifyAccessJwt', () => {
  it('accepts a valid token and returns the identity', async () => {
    const token = await makeToken(validClaims())
    const identity = await verifyAccessJwt(token, options)
    expect(identity).toEqual({ email: EMAIL, name: 'Rui Almeida' })
  })

  it('accepts an audience array that contains the configured aud', async () => {
    const token = await makeToken(validClaims({ aud: ['other', AUD] }))
    await expect(verifyAccessJwt(token, options)).resolves.toMatchObject({ email: EMAIL })
  })

  it('rejects a wrong audience', async () => {
    const token = await makeToken(validClaims({ aud: 'wrong' }))
    await expect(verifyAccessJwt(token, options)).rejects.toThrow(/audience/i)
  })

  it('rejects a wrong issuer', async () => {
    const token = await makeToken(validClaims({ iss: 'https://evil.example.com' }))
    await expect(verifyAccessJwt(token, options)).rejects.toThrow(/issuer/i)
  })

  it('rejects an expired token', async () => {
    const token = await makeToken(validClaims({ exp: Math.floor(Date.now() / 1000) - 10 }))
    await expect(verifyAccessJwt(token, options)).rejects.toThrow(/expired/i)
  })

  it('rejects a tampered signature', async () => {
    const token = await makeToken(validClaims())
    const parts = token.split('.')
    const tampered = `${parts[0]}.${parts[1]}.${'A'.repeat((parts[2] ?? '').length)}`
    await expect(verifyAccessJwt(tampered, options)).rejects.toThrow(/signature|malformed/i)
  })

  it('rejects malformed tokens', async () => {
    await expect(verifyAccessJwt('not-a-jwt', options)).rejects.toThrow(/malformed/i)
  })
})
