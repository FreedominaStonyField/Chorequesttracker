import type { CardTemplate, Difficulty } from 'shared/types'

export function difficultyMultiplier(difficulty: Difficulty) {
  switch (difficulty) {
    case 'easy':
      return 1
    case 'normal':
      return 2
    case 'hard':
      return 3
    case 'boss':
      return 5
    default:
      return 1
  }
}

export function basePointsForTemplate(template: CardTemplate) {
  return template.points
}

export function applyDifficultyMultiplier(difficulty: Difficulty, base: number) {
  return base * difficultyMultiplier(difficulty)
}
