import { useState } from 'react';
import { Chore } from '../lib/models';

type Props = {
  chores: Chore[];
  onAdd: (chore: Omit<Chore, 'id'>) => void;
  onUpdate: (id: string, patch: Partial<Chore>) => void;
  onDelete: (id: string) => void;
};

const recurrenceOptions: Chore['recurrence'][] = ['daily', 'weekly', 'custom'];

const defaults: Omit<Chore, 'id'> = {
  title: 'New chore',
  recurrence: 'daily',
  min: 2,
  mode: 4,
  max: 6,
  active: true,
};

export default function ChoresPanel({ chores, onAdd, onUpdate, onDelete }: Props) {
  const [draft, setDraft] = useState(defaults);

  const submit = () => {
    if (!draft.title.trim()) return;
    onAdd({ ...draft, title: draft.title.trim() });
    setDraft(defaults);
  };

  return (
    <section className="bg-slate-800/60 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Chores</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Chore title"
            className="bg-slate-900 rounded px-3 py-2"
          />
          <select
            value={draft.recurrence}
            onChange={(e) => setDraft((d) => ({ ...d, recurrence: e.target.value as Chore['recurrence'] }))}
            className="bg-slate-900 rounded px-3 py-2"
          >
            {recurrenceOptions.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
          <input
            type="number"
            value={draft.min}
            className="w-20 bg-slate-900 rounded px-2 py-2"
            onChange={(e) => setDraft((d) => ({ ...d, min: Number(e.target.value) }))}
            placeholder="Min"
          />
          <input
            type="number"
            value={draft.mode}
            className="w-20 bg-slate-900 rounded px-2 py-2"
            onChange={(e) => setDraft((d) => ({ ...d, mode: Number(e.target.value) }))}
            placeholder="Mode"
          />
          <input
            type="number"
            value={draft.max}
            className="w-20 bg-slate-900 rounded px-2 py-2"
            onChange={(e) => setDraft((d) => ({ ...d, max: Number(e.target.value) }))}
            placeholder="Max"
          />
          <button className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 rounded" onClick={submit}>
            Add Chore
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {chores.length === 0 && <p className="text-sm text-slate-400">No chores yet.</p>}
        {chores.map((chore) => (
          <div key={chore.id} className="bg-slate-900/40 rounded p-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto_auto] items-center text-sm">
            <input
              value={chore.title}
              onChange={(e) => onUpdate(chore.id, { title: e.target.value })}
              className="bg-transparent border border-slate-700 rounded px-2 py-1"
            />
            <select
              value={chore.recurrence}
              onChange={(e) => onUpdate(chore.id, { recurrence: e.target.value as Chore['recurrence'] })}
              className="bg-slate-900 rounded px-2 py-1"
            >
              {recurrenceOptions.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
            <input
              type="number"
              value={chore.min}
              onChange={(e) => onUpdate(chore.id, { min: Number(e.target.value) })}
              className="w-20 bg-slate-900 rounded px-2 py-1"
            />
            <input
              type="number"
              value={chore.mode}
              onChange={(e) => onUpdate(chore.id, { mode: Number(e.target.value) })}
              className="w-20 bg-slate-900 rounded px-2 py-1"
            />
            <input
              type="number"
              value={chore.max}
              onChange={(e) => onUpdate(chore.id, { max: Number(e.target.value) })}
              className="w-20 bg-slate-900 rounded px-2 py-1"
            />
            <div className="flex gap-2">
              <button
                className={`px-2 py-1 rounded text-xs ${chore.active ? 'bg-emerald-500' : 'bg-slate-700'}`}
                onClick={() => onUpdate(chore.id, { active: !chore.active })}
              >
                {chore.active ? 'Active' : 'Paused'}
              </button>
              <button className="px-2 py-1 bg-rose-500 rounded text-xs" onClick={() => onDelete(chore.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
