import {
  base64UrlDecodeString,
  base64UrlEncodeBytes,
  base64UrlEncodeString,
  base64UrlToBytes,
} from './base64url'

export const SESSION_COOKIE_NAME = 'mf_session'
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const TOKEN_VERSION = 'v1'

interface SessionPayload {
  sub: string
  iat: number
  exp: number
}

export interface SessionData {
  readonly userId: string
}

const encoder = new TextEncoder()

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

/**
 * Creates a stateless, tamper-proof session token:
 * `v1.<base64url(payload)>.<base64url(HMAC-SHA256)>`.
 * Only the signature depends on the secret; the payload is not sensitive.
 */
export async function createSessionToken(
  userId: string,
  secret: string,
  ttlMs: number = SESSION_TTL_MS,
  now: number = Date.now(),
): Promise<string> {
  const payload: SessionPayload = { sub: userId, iat: now, exp: now + ttlMs }
  const payloadPart = base64UrlEncodeString(JSON.stringify(payload))
  const key = await hmacKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadPart))
  return `${TOKEN_VERSION}.${payloadPart}.${base64UrlEncodeBytes(new Uint8Array(signature))}`
}

export async function verifySessionToken(
  token: string,
  secret: string,
  now: number = Date.now(),
): Promise<SessionData | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [version, payloadPart, signaturePart] = parts as [string, string, string]
  if (version !== TOKEN_VERSION || !payloadPart || !signaturePart) return null

  const key = await hmacKey(secret)
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlToBytes(signaturePart),
    encoder.encode(payloadPart),
  )
  if (!valid) return null

  let payload: Partial<SessionPayload>
  try {
    payload = JSON.parse(base64UrlDecodeString(payloadPart)) as Partial<SessionPayload>
  } catch {
    return null
  }

  if (
    typeof payload.sub !== 'string' ||
    typeof payload.exp !== 'number' ||
    payload.exp <= now
  ) {
    return null
  }

  return { userId: payload.sub }
}
