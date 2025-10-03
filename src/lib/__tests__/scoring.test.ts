import { describe, expect, it } from 'vitest'
import { applyDifficultyMultiplier, difficultyMultiplier } from '../scoring'

describe('difficultyMultiplier', () => {
  it('returns expected multipliers', () => {
    expect(difficultyMultiplier('easy')).toBe(1)
    expect(difficultyMultiplier('normal')).toBe(2)
    expect(difficultyMultiplier('hard')).toBe(3)
    expect(difficultyMultiplier('boss')).toBe(5)
  })
})

describe('applyDifficultyMultiplier', () => {
  it('scales the base points', () => {
    expect(applyDifficultyMultiplier('easy', 10)).toBe(10)
    expect(applyDifficultyMultiplier('normal', 10)).toBe(20)
    expect(applyDifficultyMultiplier('hard', 10)).toBe(30)
    expect(applyDifficultyMultiplier('boss', 10)).toBe(50)
  })
})
