import { describe, expect, beforeEach, it } from 'vitest'
import { createRouter } from '../index'
import { resetUsers } from '../../services/userService'

function setEnv(key: string, value?: string) {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  if (!env) return
  if (value === undefined) {
    delete env[key]
  } else {
    env[key] = value
  }
}

describe('user routes bootstrap flow', () => {
  beforeEach(() => {
    resetUsers()
    setEnv('PIN_BYPASS_SECRET', undefined)
  })

  it('allows creating the first user without authentication', async () => {
    const router = createRouter()
    const response = await router.handle({
      method: 'POST',
      path: '/users',
      headers: {},
      body: { name: 'Ava', pin: '1234' },
    })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ name: 'Ava' })
  })

  it('requires a PIN after the first user exists', async () => {
    const router = createRouter()
    await router.handle({ method: 'POST', path: '/users', headers: {}, body: { name: 'Ava', pin: '1234' } })

    const response = await router.handle({ method: 'POST', path: '/users', headers: {}, body: { name: 'Milo' } })

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({ error: 'pin_required' })
  })

  it('accepts the household PIN once users exist', async () => {
    const router = createRouter()
    await router.handle({ method: 'POST', path: '/users', headers: {}, body: { name: 'Ava', pin: '4444' } })

    const response = await router.handle({
      method: 'POST',
      path: '/users',
      headers: { 'x-household-pin': '4444' },
      body: { name: 'Nova', pin: '5555' },
    })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ name: 'Nova' })
  })

  it('permits a matching PIN_BYPASS_SECRET when users already exist', async () => {
    setEnv('PIN_BYPASS_SECRET', 'letmein')
    const router = createRouter()
    await router.handle({ method: 'POST', path: '/users', headers: {}, body: { name: 'Ava', pin: '4444' } })

    const response = await router.handle({
      method: 'POST',
      path: '/users',
      headers: { 'x-pin-bypass-secret': 'letmein' },
      body: { name: 'Zen', pin: '6666' },
    })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ name: 'Zen' })
  })

  it('rejects an incorrect PIN_BYPASS_SECRET', async () => {
    setEnv('PIN_BYPASS_SECRET', 'letmein')
    const router = createRouter()
    await router.handle({ method: 'POST', path: '/users', headers: {}, body: { name: 'Ava', pin: '4444' } })

    const response = await router.handle({
      method: 'POST',
      path: '/users',
      headers: { 'x-pin-bypass-secret': 'nope' },
      body: { name: 'Nova' },
    })

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({ error: 'pin_required' })
  })
})

