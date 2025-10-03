import { createUser, hasAnyUsers } from '../services/userService'
import type { Router } from './index'
import type { RequestContext, ResponseObject } from './types'

interface CreateUserPayload {
  name?: unknown
  pin?: unknown
}

export function registerUserRoutes(router: Router): void {
  router.post('/users', async (ctx) => {
    if ((await hasAnyUsers()) && typeof ctx.locals.actorId !== 'string') {
      return {
        status: 401,
        body: { error: 'pin_required', message: 'A verified household PIN is required to manage users.' },
      }
    }

    const payload = parsePayload(ctx)
    if (!payload.ok) {
      return payload.error
    }

    const actorId = typeof ctx.locals.actorId === 'string' ? ctx.locals.actorId : 'system'
    const user = await createUser({ name: payload.value.name, pin: payload.value.pin }, actorId)

    return { status: 201, body: user }
  })
}

function parsePayload(ctx: RequestContext):
  | { ok: true; value: { name: string; pin?: string } }
  | { ok: false; error: ResponseObject } {
  const payload = (ctx.body ?? {}) as CreateUserPayload
  const name = typeof payload.name === 'string' ? payload.name.trim() : ''
  const pin = typeof payload.pin === 'string' ? payload.pin.trim() : undefined

  if (!name) {
    return {
      ok: false,
      error: { status: 400, body: { error: 'invalid_payload', message: 'A display name is required.' } },
    }
  }

  return { ok: true, value: { name, pin: pin?.length ? pin : undefined } }
}

