import { ChangeEvent } from 'react';
import { AppState } from '../lib/models';

type Props = {
  state: AppState;
  onImport: (state: AppState) => void;
};

export default function ImportExport({ state, onImport }: Props) {
  const exportState = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'questchores-state.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      onImport(parsed);
    } catch (err) {
      alert('Invalid JSON file');
    }
  };

  return (
    <section className="bg-slate-800/60 rounded-lg p-4 space-y-3 text-sm">
      <h2 className="text-lg font-semibold">Import / Export</h2>
      <div className="flex flex-wrap gap-3">
        <button className="px-3 py-2 bg-sky-500 hover:bg-sky-400 rounded" onClick={exportState}>
          Export JSON
        </button>
        <label className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 rounded cursor-pointer">
          Import JSON
          <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
        </label>
      </div>
    </section>
  );
}
