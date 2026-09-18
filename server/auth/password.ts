/**
 * Constant-time string comparison to avoid leaking credential length/content
 * through timing. Lengths are folded into the mismatch accumulator so both
 * inputs are always fully traversed.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a)
  const bBytes = new TextEncoder().encode(b)
  let mismatch = aBytes.length ^ bBytes.length
  const max = Math.max(aBytes.length, bBytes.length)
  for (let index = 0; index < max; index += 1) {
    mismatch |= (aBytes[index] ?? 0) ^ (bBytes[index] ?? 0)
  }
  return mismatch === 0
}

export interface CredentialConfig {
  readonly authEmail?: string
  readonly authPassword?: string
}

/** Validates the single configured email/password pair. */
export function verifyCredentials(
  email: string,
  password: string,
  config: CredentialConfig,
): boolean {
  if (!config.authEmail || !config.authPassword) return false
  const emailMatches = timingSafeEqual(
    email.trim().toLowerCase(),
    config.authEmail.trim().toLowerCase(),
  )
  const passwordMatches = timingSafeEqual(password, config.authPassword)
  return emailMatches && passwordMatches
}
