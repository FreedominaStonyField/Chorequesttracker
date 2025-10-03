import { describe, expect, it } from 'vitest'
import { updateStreaks } from '../streaks'

describe('updateStreaks', () => {
  it('initialises streaks when empty', () => {
    const { state, snapshot } = updateStreaks('daily')
    expect(state.daily).toBe(1)
    expect(snapshot.daily).toBe(1)
  })

  it('increments streaks and tracks longest', () => {
    const first = updateStreaks('weekly')
    const second = updateStreaks('weekly', first.state)
    expect(second.state.weekly).toBe(2)
    expect(second.state.longest.weekly).toBe(2)
  })

  it('handles one-time quests separately', () => {
    const { state } = updateStreaks('once')
    expect(state.once).toBe(1)
  })
})
