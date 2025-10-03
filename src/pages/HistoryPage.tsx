import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import { useAtom } from 'jotai'
import { currentUserAtom } from '../lib/state'
import { useHistory } from '../hooks/useRepository'
import { saveAs } from '../utils/saveAs'
import type { Difficulty, Recurrence } from '../types'

interface HistoryFilters {
  difficulty: Difficulty | 'all'
  recurrence: Recurrence | 'all'
  tag: string
  start?: string
  end?: string
}

export function HistoryPage() {
  const [currentUser] = useAtom(currentUserAtom)
  const { data } = useHistory(currentUser?.id)
  const [filters, setFilters] = useState<HistoryFilters>({ difficulty: 'all', recurrence: 'all', tag: '' })

  const grouped = useMemo(() => {
    if (!data) return []
    const filtered = data.filter(({ template, completion }) => {
      if (filters.difficulty !== 'all' && template.difficulty !== filters.difficulty) return false
      if (filters.recurrence !== 'all' && template.recurrence !== filters.recurrence) return false
      if (filters.tag && !template.tags.includes(filters.tag)) return false
      if (filters.start && new Date(filters.start) > new Date(completion.completedAt)) return false
      if (filters.end && new Date(filters.end) < new Date(completion.completedAt)) return false
      return true
    })
    const groups = new Map<string, typeof filtered>()
    for (const entry of filtered) {
      const day = format(new Date(entry.completion.completedAt), 'yyyy-MM-dd')
      const existing = groups.get(day) ?? []
      existing.push(entry)
      groups.set(day, existing)
    }
    return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [data, filters])

  function handleExportCSV() {
    if (!data || !currentUser) return
    const rows = [
      ['Date', 'Title', 'Recurrence', 'Difficulty', 'Points', 'Notes', 'Tags'].join(','),
      ...data.map(({ completion, template }) =>
        [
          format(new Date(completion.completedAt), 'yyyy-MM-dd HH:mm'),
          template.title,
          template.recurrence,
          template.difficulty,
          completion.pointsAwarded,
          JSON.stringify(template.notes ?? ''),
          template.tags.join('|'),
        ].join(','),
      ),
    ]
    saveAs(`${currentUser.name}-quest-history.csv`, rows.join('\n'))
  }

  function handleExportJson() {
    if (!data || !currentUser) return
    saveAs(`${currentUser.name}-quest-history.json`, JSON.stringify(data, null, 2))
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-slate-700 bg-slate-900/70 p-5 text-sm text-slate-300">
        <h2 className="text-lg font-semibold text-white">My Pile</h2>
        <p className="mt-2 text-slate-400">Your quest completions organised by day. Filter by difficulty, tags, or recurrence.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Difficulty</span>
            <select
              value={filters.difficulty}
              onChange={(event) => setFilters((prev) => ({ ...prev, difficulty: event.target.value as HistoryFilters['difficulty'] }))}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            >
              <option value="all">All</option>
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
              <option value="boss">Boss</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Recurrence</span>
            <select
              value={filters.recurrence}
              onChange={(event) => setFilters((prev) => ({ ...prev, recurrence: event.target.value as HistoryFilters['recurrence'] }))}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            >
              <option value="all">All</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="once">One-time</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Tag</span>
            <input
              value={filters.tag}
              onChange={(event) => setFilters((prev) => ({ ...prev, tag: event.target.value }))}
              placeholder="laundry"
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            />
          </label>
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Start</span>
              <input
                type="date"
                value={filters.start ?? ''}
                onChange={(event) => setFilters((prev) => ({ ...prev, start: event.target.value }))}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">End</span>
              <input
                type="date"
                value={filters.end ?? ''}
                onChange={(event) => setFilters((prev) => ({ ...prev, end: event.target.value }))}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              />
            </label>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleExportCSV}
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-primary"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-primary"
          >
            Export JSON
          </button>
        </div>
      </section>

      {!currentUser ? (
        <p className="text-center text-slate-400">Choose a hero to see their quest pile.</p>
      ) : grouped.length === 0 ? (
        <p className="text-center text-slate-500">No completed quests yet. Claim some from the feed!</p>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map(([day, entries]) => (
            <section key={day} className="rounded-3xl border border-slate-700 bg-slate-900/70 p-4">
              <h3 className="text-lg font-semibold text-white">{format(new Date(day), 'EEEE, MMM d')}</h3>
              <ul className="mt-3 space-y-3">
                {entries.map(({ completion, template }) => (
                  <li
                    key={completion.id}
                    className="flex flex-col gap-1 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 text-sm text-slate-200 shadow"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-base font-semibold text-white">{template.title}</span>
                      <span className="text-xs font-semibold uppercase tracking-widest text-primary/70">
                        {template.recurrence} • {template.difficulty} • {completion.pointsAwarded} pts
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Completed at {format(new Date(completion.completedAt), 'h:mma')}</p>
                    <p className="text-sm text-slate-300">{template.flavorText}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
