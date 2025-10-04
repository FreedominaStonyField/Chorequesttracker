import type { Recurrence, StreakSnapshot, StreakState } from './types.js'

export function updateStreaks(recurrence: Recurrence, current?: StreakState) {
  const base: StreakState =
    current ?? {
      daily: 0,
      weekly: 0,
      monthly: 0,
      once: 0,
      longest: {},
    }

  const snapshot: StreakSnapshot = {}
  const updated: StreakState = {
    ...base,
    longest: { ...base.longest },
  }

  switch (recurrence) {
    case 'daily':
      updated.daily += 1
      snapshot.daily = updated.daily
      updated.longest.daily = Math.max(updated.longest.daily ?? 0, updated.daily)
      break
    case 'weekly':
      updated.weekly += 1
      snapshot.weekly = updated.weekly
      updated.longest.weekly = Math.max(updated.longest.weekly ?? 0, updated.weekly)
      break
    case 'monthly':
      updated.monthly += 1
      snapshot.monthly = updated.monthly
      updated.longest.monthly = Math.max(updated.longest.monthly ?? 0, updated.monthly)
      break
    case 'once':
      updated.once += 1
      snapshot.once = updated.once
      updated.longest.once = Math.max(updated.longest.once ?? 0, updated.once)
      break
  }

  return { state: updated, snapshot }
}
