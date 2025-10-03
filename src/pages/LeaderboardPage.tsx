import { useLeaderboard } from '../hooks/useRepository'
import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

const ranges: Array<{ id: 'week' | 'month' | 'all'; label: string }> = [
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all', label: 'All Time' },
]

export function LeaderboardPage() {
  const [range, setRange] = useState<'week' | 'month' | 'all'>('week')
  const { data, isLoading } = useLeaderboard(range)

  const topScore = useMemo(() => (data && data.length ? data[0].points : 0), [data])

  return (
    <section className="flex flex-col gap-6">
      <div className="rounded-3xl border border-slate-700 bg-slate-900/70 p-6 text-slate-200">
        <h2 className="text-2xl font-semibold text-white">Guild Leaderboard</h2>
        <p className="mt-2 text-sm text-slate-400">
          Points reset according to the selected range. Ties are broken by completions, then earliest finish.
        </p>
        <div className="mt-4 flex gap-3">
          {ranges.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setRange(option.id)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                range === option.id
                  ? 'border-primary bg-primary/30 text-primary-foreground shadow'
                  : 'border-slate-600 bg-slate-800/70 text-slate-300 hover:border-primary/60'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-slate-400">Summoning leaderboard...</p>
      ) : !data || data.length === 0 ? (
        <p className="text-center text-slate-400">No quests completed in this range yet.</p>
      ) : (
        <ol className="space-y-3">
          {data.map((entry, index) => {
            const isTop = entry.points === topScore && index === 0
            return (
              <li
                key={entry.user.id}
                className={`flex items-center justify-between gap-4 rounded-3xl border px-5 py-4 text-sm shadow-lg transition ${
                  isTop
                    ? 'border-yellow-300/60 bg-yellow-500/20 text-yellow-100'
                    : 'border-slate-700 bg-slate-900/70 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold">#{index + 1}</span>
                  <span className="text-2xl" aria-hidden>
                    {entry.user.avatarEmoji}
                  </span>
                  <div>
                    <p className="text-lg font-semibold">{entry.user.name}</p>
                    <p className="text-xs uppercase tracking-widest text-slate-400">
                      {entry.points} pts • {entry.completions} completions
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>Earliest completion {formatDistanceToNow(entry.earliest, { addSuffix: true })}</p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
