import { useMemo, useState } from 'react'
import { nanoid } from 'nanoid'
import type { CardTemplate, Difficulty, Recurrence } from '../../types'
import { QuestCard } from '../../components/QuestCard'
import type { FeedCard } from 'shared/types'

const difficulties: Difficulty[] = ['easy', 'normal', 'hard', 'boss']
const recurrences: Recurrence[] = ['daily', 'weekly', 'monthly', 'once']

interface CardEditorFormProps {
  template?: CardTemplate
  currentUserId: string
  onSubmit: (template: CardTemplate) => Promise<void> | void
  onCancel?: () => void
  onDelete?: (template: CardTemplate) => Promise<void> | void
}

export function CardEditorForm({ template, currentUserId, onSubmit, onCancel, onDelete }: CardEditorFormProps) {
  const [form, setForm] = useState<CardTemplate>(() =>
    template ?? {
      id: nanoid(),
      title: '',
      flavorText: '',
      difficulty: 'normal',
      points: 10,
      recurrence: 'daily',
      active: true,
      tags: [],
      notes: '',
      createdBy: currentUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      weekAnchor: 1,
      monthAnchor: 1,
      requireProof: false,
    },
  )

  function updateField<T extends keyof CardTemplate>(field: T, value: CardTemplate[T]) {
    setForm((prev) => ({ ...prev, [field]: value, updatedAt: new Date().toISOString() }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({ ...form, tags: form.tags.map((tag) => tag.trim()).filter(Boolean) })
  }

  const preview: FeedCard = useMemo(
    () => ({
      id: 'preview',
      templateId: form.id,
      scheduledFor: new Date().toISOString(),
      status: 'available',
      createdAt: new Date().toISOString(),
      assignedTo: undefined,
      expiresAt: new Date().toISOString(),
      template: form,
      completion: undefined,
    }),
    [form],
  )

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-[2fr,3fr]">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-slate-200">Quest Title</span>
          <input
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
            required
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-slate-200">Flavor Text</span>
          <textarea
            value={form.flavorText ?? ''}
            onChange={(event) => updateField('flavorText', event.target.value)}
            rows={3}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-primary"
            placeholder="Leave blank to auto-generate"
          />
        </label>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-200">Difficulty</span>
            <select
              value={form.difficulty}
              onChange={(event) => updateField('difficulty', event.target.value as Difficulty)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            >
              {difficulties.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {difficulty}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-200">Recurrence</span>
            <select
              value={form.recurrence}
              onChange={(event) => updateField('recurrence', event.target.value as Recurrence)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            >
              {recurrences.map((recurrence) => (
                <option key={recurrence} value={recurrence}>
                  {recurrence}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="flex flex-col gap-2">
            <span className="font-semibold text-slate-200">Points</span>
            <input
              type="number"
              value={form.points}
              min={1}
              onChange={(event) => updateField('points', Number.parseInt(event.target.value, 10) || 0)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            />
          </label>
          {form.recurrence === 'weekly' && (
            <label className="flex flex-col gap-2">
              <span className="font-semibold text-slate-200">Week Anchor (0=Sun)</span>
              <input
                type="number"
                value={form.weekAnchor ?? 1}
                min={0}
                max={6}
                onChange={(event) => updateField('weekAnchor', Number.parseInt(event.target.value, 10) || 0)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              />
            </label>
          )}
          {form.recurrence === 'monthly' && (
            <label className="flex flex-col gap-2">
              <span className="font-semibold text-slate-200">Month Anchor (1-31)</span>
              <input
                type="number"
                value={form.monthAnchor ?? 1}
                min={1}
                max={31}
                onChange={(event) => updateField('monthAnchor', Number.parseInt(event.target.value, 10) || 1)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
              />
            </label>
          )}
        </div>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-slate-200">Tags</span>
          <input
            value={form.tags.join(', ')}
            onChange={(event) => updateField('tags', event.target.value.split(','))}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
            placeholder="kitchen, dishes"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-slate-200">Notes</span>
          <textarea
            value={form.notes ?? ''}
            onChange={(event) => updateField('notes', event.target.value)}
            rows={3}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white"
          />
        </label>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => updateField('active', event.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800"
            />
            Active
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.requireProof ?? false}
              onChange={(event) => updateField('requireProof', event.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800"
            />
            Require proof
          </label>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-indigo-500"
          >
            Save Quest
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-primary"
            >
              Cancel
            </button>
          )}
          {onDelete && template && (
            <button
              type="button"
              onClick={() => onDelete({ ...form })}
              className="rounded-xl border border-red-500/60 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20"
            >
              Remove Quest
            </button>
          )}
        </div>
      </div>
      <div className="rounded-3xl border border-slate-700 bg-slate-900/70 p-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary/80">Preview</p>
        <div className="mt-4">
          <QuestCard card={preview} onClaim={() => {}} onComplete={() => {}} currentUser={null} />
        </div>
      </div>
    </form>
  )
}
