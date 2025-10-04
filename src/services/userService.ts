import { nanoid } from 'nanoid'
import { timingSafeEqual } from '../utils/timingSafeEqual'

export interface UserRecord {
  id: string
  name: string
  pin?: string
  createdAt: string
  createdBy: string
}

export interface CreateUserInput {
  name: string
  pin?: string
  id?: string
}

export interface PublicUser {
  id: string
  name: string
  createdAt: string
  createdBy: string
}

const users = new Map<string, UserRecord>()

export async function hasAnyUsers(): Promise<boolean> {
  return users.size > 0
}

export async function listUsers(): Promise<PublicUser[]> {
  return [...users.values()].map(sanitiseUser)
}

export async function createUser(input: CreateUserInput, actorId: string): Promise<PublicUser> {
  const id = input.id?.trim() || nanoid()
  const name = input.name.trim()
  const pin = normalisePin(input.pin)

  const record: UserRecord = {
    id,
    name,
    pin,
    createdAt: new Date().toISOString(),
    createdBy: actorId,
  }

  users.set(record.id, record)
  return sanitiseUser(record)
}

export async function findUserByPin(pin: string): Promise<UserRecord | undefined> {
  for (const user of users.values()) {
    if (!user.pin) continue
    if (timingSafeEqual(user.pin, pin)) {
      return user
    }
  }
  return undefined
}

export function resetUsers(): void {
  users.clear()
}

function normalisePin(pin?: string): string | undefined {
  if (!pin) return undefined
  const trimmed = pin.trim()
  return trimmed.length ? trimmed : undefined
}

function sanitiseUser(user: UserRecord): PublicUser {
  const { pin: _pin, ...rest } = user
  return rest
}

