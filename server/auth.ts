import type { NextFunction, Request, Response } from 'express'
import { timingSafeEqual } from '../src/utils/timingSafeEqual.js'
import { store } from './store.js'

const PIN_HEADER = 'x-household-pin'
const PIN_BYPASS_HEADER = 'x-pin-bypass-secret'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const isUsersIndexRead = req.method === 'GET' && req.baseUrl === '/api/users' && req.path === '/'
  const bypassSecret = getEnvSecret()
  const providedBypass = readHeader(req, PIN_BYPASS_HEADER)

  if (bypassSecret && providedBypass && timingSafeEqual(bypassSecret, providedBypass)) {
    req.auth = { actorId: 'system', actorRole: 'system' }
    return next()
  }

  if (!store.hasUsers()) {
    req.auth = { actorId: 'system', actorRole: 'system' }
    return next()
  }

  const providedPin = readHeader(req, PIN_HEADER)
  if (!providedPin) {
    if (isUsersIndexRead) {
      return next()
    }
    return res.status(401).json({ error: 'pin_required', message: 'Household PIN is required once users exist.' })
  }

  const user = store.findUserByPin(providedPin)
  if (!user) {
    return res.status(401).json({ error: 'invalid_pin', message: 'The supplied household PIN was not recognised.' })
  }

  req.auth = { actorId: user.id, actorRole: 'user' }
  return next()
}

function readHeader(req: Request, name: string): string | undefined {
  const value = req.header(name)
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

function getEnvSecret(): string | undefined {
  const secret = process.env.PIN_BYPASS_SECRET
  return secret && secret.length ? secret : undefined
}
