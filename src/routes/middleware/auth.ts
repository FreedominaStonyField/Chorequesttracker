import { findUserByPin, hasAnyUsers } from '../../services/userService'
import { timingSafeEqual } from '../../utils/timingSafeEqual'
import type { Middleware, RequestContext, ResponseObject } from '../types'

const PIN_HEADER = 'x-household-pin'
const PIN_BYPASS_HEADER = 'x-pin-bypass-secret'

export const authMiddleware: Middleware = async (ctx, next) => {
  const bypassSecret = getPinBypassSecret()
  const providedBypass = readHeader(ctx, PIN_BYPASS_HEADER)

  if (bypassSecret && providedBypass && timingSafeEqual(bypassSecret, providedBypass)) {
    injectSystemIdentity(ctx)
    return next()
  }

  if (!(await hasAnyUsers())) {
    injectSystemIdentity(ctx)
    return next()
  }

  const providedPin = readHeader(ctx, PIN_HEADER)
  if (!providedPin) {
    return unauthorized('pin_required', 'Household PIN is required once users exist.')
  }

  const user = await findUserByPin(providedPin)
  if (!user) {
    return unauthorized('invalid_pin', 'The supplied household PIN was not recognised.')
  }

  ctx.locals.actorId = user.id
  ctx.locals.user = { id: user.id, name: user.name }
  return next()
}

function readHeader(ctx: RequestContext, name: string): string | undefined {
  const value = ctx.headers[name.toLowerCase()]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

function getPinBypassSecret(): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  const secret = env?.PIN_BYPASS_SECRET
  return secret && secret.length ? secret : undefined
}

function injectSystemIdentity(ctx: RequestContext): void {
  ctx.locals.actorId = 'system'
  ctx.locals.actorRole = 'system'
}

function unauthorized(error: string, message: string): ResponseObject {
  return {
    status: 401,
    body: { error, message },
  }
}

