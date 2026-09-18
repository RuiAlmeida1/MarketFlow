import { z } from 'zod'
import type { LogoutResponse, SessionResponse } from '../../shared/api/contracts'
import { UnauthorizedError, ValidationError } from '../../shared/domain/errors'
import { verifyCredentials } from '../auth/password'
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  createSessionToken,
} from '../auth/session'
import type { RouteHandler } from '../http/context'
import { serializeCookie } from '../http/cookies'
import { jsonResponse } from '../http/response'
import { readJson } from '../validation/body'

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
})

function isSecure(env: { APP_ENV?: string }): boolean {
  return (env.APP_ENV ?? 'production') === 'production'
}

export const loginHandler: RouteHandler = async (context) => {
  const credentials = await readJson(context.request, loginSchema)

  if (!context.env.SESSION_SECRET) {
    throw new ValidationError('Password sign-in is not configured.')
  }

  const valid = verifyCredentials(credentials.email, credentials.password, {
    authEmail: context.env.AUTH_EMAIL,
    authPassword: context.env.AUTH_PASSWORD,
  })
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password.')
  }

  const user = await context.services.accounts.resolveForEmail(
    credentials.email,
    credentials.email,
  )
  const token = await createSessionToken(user.id, context.env.SESSION_SECRET)
  const cookie = serializeCookie(SESSION_COOKIE_NAME, token, {
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    httpOnly: true,
    secure: isSecure(context.env),
    sameSite: 'Lax',
  })

  const body: SessionResponse = { user }
  return jsonResponse(body, 200, { 'set-cookie': cookie })
}

export const logoutHandler: RouteHandler = (context) => {
  const cookie = serializeCookie(SESSION_COOKIE_NAME, '', {
    maxAge: 0,
    httpOnly: true,
    secure: isSecure(context.env),
    sameSite: 'Lax',
  })
  const body: LogoutResponse = { success: true }
  return jsonResponse(body, 200, { 'set-cookie': cookie })
}

export const sessionHandler: RouteHandler = async (context) => {
  const userId = await context.getUserId()
  const user = await context.services.users.findById(userId)
  if (!user) throw new UnauthorizedError()
  const body: SessionResponse = { user }
  return jsonResponse(body)
}
