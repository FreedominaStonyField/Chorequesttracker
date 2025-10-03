import type { Difficulty } from '../types'
import clsx from 'clsx'

const labelMap: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  boss: 'Boss',
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase shadow-sm',
        {
          'bg-difficulty-easy/20 text-difficulty-easy': difficulty === 'easy',
          'bg-difficulty-normal/20 text-difficulty-normal': difficulty === 'normal',
          'bg-difficulty-hard/20 text-difficulty-hard': difficulty === 'hard',
          'bg-difficulty-boss/20 text-difficulty-boss': difficulty === 'boss',
        },
      )}
    >
      {labelMap[difficulty]}
    </span>
  )
}
