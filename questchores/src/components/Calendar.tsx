import { Completion, Payout } from '../lib/models';
import { toDateOnlyISO } from '../lib/dates';

type Props = {
  selectedDate: string;
  onSelectDate: (iso: string) => void;
  completions: Completion[];
  payouts: Payout[];
};

function buildMonthDays(dateISO: string) {
  const base = new Date(dateISO);
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const days: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(toDateOnlyISO(d));
  }
  return days;
}

export default function Calendar({ selectedDate, onSelectDate, completions, payouts }: Props) {
  const days = buildMonthDays(selectedDate);
  const completionCount = new Map<string, number>();
  completions.forEach((c) => completionCount.set(c.dateISO, (completionCount.get(c.dateISO) ?? 0) + 1));
  const payoutTotals = new Map<string, number>();
  payouts.forEach((p) => payoutTotals.set(p.dateISO, (payoutTotals.get(p.dateISO) ?? 0) + p.amount));
  const month = new Date(selectedDate).toLocaleString(undefined, { month: 'long', year: 'numeric' });

  return (
    <section className="bg-slate-800/60 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Calendar</h2>
        <div className="text-sm text-slate-300">{month}</div>
      </div>
      <div className="grid grid-cols-7 text-xs text-center text-slate-400 uppercase">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dow) => (
          <div key={dow} className="py-1">
            {dow}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-sm">
        {days.map((day) => {
          const date = new Date(day);
          const isCurrentMonth = date.getMonth() === new Date(selectedDate).getMonth();
          const isSelected = day === selectedDate;
          const comps = completionCount.get(day) ?? 0;
          const payout = payoutTotals.get(day) ?? 0;
          return (
            <button
              key={day}
              onClick={() => onSelectDate(day)}
              className={`rounded px-2 py-3 text-left space-y-1 transition border border-transparent ${
                isSelected ? 'bg-sky-600 border-sky-300' : isCurrentMonth ? 'bg-slate-900/40' : 'bg-slate-900/10'
              }`}
            >
              <div className="text-xs font-semibold">{date.getDate()}</div>
              {comps > 0 && <div className="text-[10px] text-emerald-300">{comps} quests</div>}
              {payout > 0 && <div className="text-[10px] text-amber-300">${payout.toFixed(2)}</div>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
