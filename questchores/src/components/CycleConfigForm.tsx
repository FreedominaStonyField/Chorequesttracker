import { CycleConfig } from '../lib/models';

type Props = {
  config: CycleConfig;
  onChange: (config: CycleConfig) => void;
  onReset: () => void;
};

export default function CycleConfigForm({ config, onChange, onReset }: Props) {
  const update = (patch: Partial<CycleConfig>) => onChange({ ...config, ...patch });

  return (
    <section className="bg-slate-800/60 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cycle Setup</h2>
        <button
          className="px-3 py-1 rounded bg-rose-500 hover:bg-rose-400 text-sm"
          onClick={onReset}
        >
          Start / Reset Cycle
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col text-sm gap-1">
          Cash Pool ($)
          <input
            type="number"
            min={0}
            value={config.cashPoolTotal}
            onChange={(e) => update({ cashPoolTotal: Number(e.target.value) })}
            className="bg-slate-900 rounded px-3 py-2"
          />
        </label>
        <label className="flex flex-col text-sm gap-1">
          Cycle Days
          <input
            type="number"
            min={1}
            value={config.cycleDays}
            onChange={(e) => update({ cycleDays: Number(e.target.value) })}
            className="bg-slate-900 rounded px-3 py-2"
          />
        </label>
        <label className="flex flex-col text-sm gap-1">
          Start Date
          <input
            type="date"
            value={config.startDateISO.slice(0, 10)}
            onChange={(e) => update({ startDateISO: e.target.value })}
            className="bg-slate-900 rounded px-3 py-2"
          />
        </label>
        <label className="flex flex-col text-sm gap-1">
          RNG Seed
          <input
            value={config.seed}
            onChange={(e) => update({ seed: e.target.value })}
            className="bg-slate-900 rounded px-3 py-2"
          />
        </label>
      </div>
    </section>
  );
}
