import clsx from 'clsx'
import type { QuestFilterState } from '../types'

const recurrenceOptions = [
  { label: 'All', value: 'all' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'One-time', value: 'once' },
]

interface QuestFiltersProps {
  filter: QuestFilterState
  onChange: (next: QuestFilterState) => void
}

export function QuestFilters({ filter, onChange }: QuestFiltersProps) {
  function toggle(field: keyof QuestFilterState) {
    onChange({ ...filter, [field]: !filter[field] })
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-slate-700 bg-slate-900/70 p-4 shadow-inner">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {recurrenceOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={clsx(
                'rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold uppercase tracking-widest transition',
                filter.recurrence === option.value ? 'border-primary bg-primary/20 text-primary-foreground' : 'hover:border-primary/50',
              )}
              onClick={() =>
                onChange({
                  ...filter,
                  recurrence: option.value as QuestFilterState['recurrence'],
                })
              }
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
            <input
              type="checkbox"
              checked={filter.mine}
              onChange={() => toggle('mine')}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800"
            />
            Mine
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
            <input
              type="checkbox"
              checked={filter.unclaimed}
              onChange={() => toggle('unclaimed')}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800"
            />
            Unclaimed
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
            <input
              type="checkbox"
              checked={filter.completed}
              onChange={() => toggle('completed')}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800"
            />
            Completed
          </label>
        </div>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-2">
          <span aria-hidden className="text-slate-500">🔍</span>
          <input
            type="search"
            value={filter.search}
            onChange={(event) => onChange({ ...filter, search: event.target.value })}
            placeholder="Search quests, tags, notes..."
            className="ml-2 flex-1 bg-transparent text-sm text-slate-100 outline-none"
          />
        </div>
        {filter.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            {filter.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-slate-800/60 px-3 py-1 uppercase tracking-widest">
                #{tag}
              </span>
            ))}
            <button
              type="button"
              onClick={() => onChange({ ...filter, tags: [] })}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Clear tags
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
