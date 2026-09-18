import { UnauthorizedError } from '../../shared/domain/errors'

/**
 * Verifies a Cloudflare Access JWT (RS256) against the team's published JWKS.
 *
 * The `Cf-Access-Jwt-Assertion` header is injected by Access at the edge. We
 * still verify the signature and claims server-side so that requests bypassing
 * Access (e.g. direct workers.dev access) cannot forge an identity.
 */

interface AccessJwtOptions {
  readonly teamDomain: string
  readonly aud: string
  readonly fetcher?: typeof fetch
}

export interface AccessIdentity {
  readonly email: string
  readonly name: string
}

interface Jwk extends JsonWebKey {
  kid?: string
}

interface AccessClaims {
  email?: string
  name?: string
  aud?: string | string[]
  iss?: string
  exp?: number
}

const JWKS_TTL_MS = 60 * 60 * 1000
let jwksCache: { domain: string; keys: Jwk[]; expiresAt: number } | null = null

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  )
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function base64UrlToString(value: string): string {
  return new TextDecoder().decode(base64UrlToBytes(value))
}

async function getSigningKeys(teamDomain: string, fetcher: typeof fetch): Promise<Jwk[]> {
  if (
    jwksCache &&
    jwksCache.domain === teamDomain &&
    jwksCache.expiresAt > Date.now()
  ) {
    return jwksCache.keys
  }

  const response = await fetcher(`https://${teamDomain}/cdn-cgi/access/certs`, {
    headers: { accept: 'application/json' },
  })
  if (!response.ok) {
    throw new UnauthorizedError('Unable to verify Cloudflare Access credentials.')
  }

  const payload = (await response.json()) as { keys?: Jwk[] }
  if (!Array.isArray(payload.keys) || payload.keys.length === 0) {
    throw new UnauthorizedError('Cloudflare Access published no signing keys.')
  }

  jwksCache = {
    domain: teamDomain,
    keys: payload.keys,
    expiresAt: Date.now() + JWKS_TTL_MS,
  }
  return payload.keys
}

export async function verifyAccessJwt(
  token: string,
  options: AccessJwtOptions,
): Promise<AccessIdentity> {
  const fetcher = options.fetcher ?? fetch
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new UnauthorizedError('Malformed access token.')
  }
  const [headerPart, payloadPart, signaturePart] = parts as [string, string, string]

  let header: { alg?: string; kid?: string }
  let claims: AccessClaims
  try {
    header = JSON.parse(base64UrlToString(headerPart)) as { alg?: string; kid?: string }
    claims = JSON.parse(base64UrlToString(payloadPart)) as AccessClaims
  } catch {
    throw new UnauthorizedError('Malformed access token.')
  }

  if (header.alg !== 'RS256') {
    throw new UnauthorizedError('Unsupported access token algorithm.')
  }

  if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()) {
    throw new UnauthorizedError('Access token has expired.')
  }

  const issuer = `https://${options.teamDomain}`
  if (claims.iss !== issuer) {
    throw new UnauthorizedError('Invalid access token issuer.')
  }

  const audiences = Array.isArray(claims.aud)
    ? claims.aud
    : claims.aud
      ? [claims.aud]
      : []
  if (!audiences.includes(options.aud)) {
    throw new UnauthorizedError('Invalid access token audience.')
  }

  const keys = await getSigningKeys(options.teamDomain, fetcher)
  const jwk = keys.find((key) => key.kid === header.kid) ?? keys[0]
  if (!jwk) {
    throw new UnauthorizedError('No signing key available.')
  }

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    base64UrlToBytes(signaturePart),
    new TextEncoder().encode(`${headerPart}.${payloadPart}`),
  )
  if (!valid) {
    throw new UnauthorizedError('Invalid access token signature.')
  }

  if (!claims.email) {
    throw new UnauthorizedError('Access token has no email claim.')
  }

  return { email: claims.email.toLowerCase(), name: claims.name ?? claims.email }
}
