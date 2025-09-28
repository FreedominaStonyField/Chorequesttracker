import { useMemo } from 'react';
import { Chore, Completion, CycleConfig, Payout, User } from '../lib/models';
import { planDailyAllocation } from '../lib/simulate';
import { cycleDayLabel } from '../lib/dates';

type Props = {
  dateISO: string;
  onDateChange: (dateISO: string) => void;
  users: User[];
  chores: Chore[];
  completions: Completion[];
  payouts: Payout[];
  config: CycleConfig;
  onAddCompletion: (userId: string, choreId: string, dateISO: string) => void;
  onRemoveCompletion: (id: string) => void;
  onAllocate: (dateISO: string) => void;
};

export default function DayView({
  dateISO,
  onDateChange,
  users,
  chores,
  completions,
  payouts,
  config,
  onAddCompletion,
  onRemoveCompletion,
  onAllocate,
}: Props) {
  const dayCompletions = completions.filter((c) => c.dateISO === dateISO);
  const dayPayouts = payouts.filter((p) => p.dateISO === dateISO);

  const plan = useMemo(
    () => planDailyAllocation({ users, chores, completions, payouts, config }, dateISO),
    [users, chores, completions, payouts, config, dateISO]
  );

  const choreMap = new Map(chores.map((c) => [c.id, c]));
  const userMap = new Map(users.map((u) => [u.id, u]));
  const completionMap = new Map(completions.map((c) => [c.id, c]));
  const activeChores = chores.filter((c) => c.active);

  return (
    <section className="bg-slate-800/60 rounded-lg p-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Day View</h2>
          <p className="text-sm text-slate-300">{cycleDayLabel(dateISO, config)}</p>
        </div>
        <input
          type="date"
          value={dateISO}
          onChange={(e) => onDateChange(e.target.value)}
          className="bg-slate-900 rounded px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-slate-300">Daily Budget:</span> ${plan.dailyBudget.toFixed(2)}
          </div>
          <button
            className="px-3 py-2 bg-amber-500 hover:bg-amber-400 rounded"
            onClick={() => onAllocate(dateISO)}
          >
            Allocate Payouts
          </button>
        </div>
        <div className="text-xs text-slate-400">
          Suggested total ${plan.totalSuggested.toFixed(2)} → Final ${plan.totalFinal.toFixed(2)}
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Log completion</h3>
        <div className="space-y-2">
          {activeChores.length === 0 && <p className="text-sm text-slate-400">No active chores.</p>}
          {activeChores.map((chore) => (
            <div key={chore.id} className="bg-slate-900/40 rounded p-3">
              <div className="font-medium text-sm">{chore.title}</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {users.map((user) => (
                  <button
                    key={user.id}
                    className="px-3 py-1 bg-sky-500 rounded text-xs"
                    onClick={() => onAddCompletion(user.id, chore.id, dateISO)}
                  >
                    {user.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Today's Completions</h3>
        {dayCompletions.length === 0 && <p className="text-sm text-slate-400">None logged.</p>}
        {dayCompletions.map((completion) => (
          <div key={completion.id} className="flex items-center justify-between bg-slate-900/40 rounded px-3 py-2 text-sm">
            <span>
              {userMap.get(completion.userId)?.name ?? 'Unknown'} → {choreMap.get(completion.choreId)?.title ?? 'Chore'}
            </span>
            <button className="text-xs text-rose-300" onClick={() => onRemoveCompletion(completion.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Planned Payouts</h3>
        {plan.entries.length === 0 && <p className="text-sm text-slate-400">No pending payouts.</p>}
        {plan.entries.map((entry) => (
          <div key={entry.completion.id} className="flex items-center justify-between bg-slate-900/40 rounded px-3 py-2 text-sm">
            <span>
              {userMap.get(entry.completion.userId)?.name ?? 'User'} • {choreMap.get(entry.completion.choreId)?.title ?? 'Chore'}
            </span>
            <span>
              ${entry.final.toFixed(2)} <span className="text-xs text-slate-400">(suggested ${entry.suggested.toFixed(2)})</span>
            </span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Payouts Logged</h3>
        {dayPayouts.length === 0 && <p className="text-sm text-slate-400">Allocation not run yet.</p>}
        {dayPayouts.map((payout) => {
          const completion = completionMap.get(payout.completionId);
          const userName = completion ? userMap.get(completion.userId)?.name ?? 'User' : 'User';
          const choreName = completion ? choreMap.get(completion.choreId)?.title ?? 'Chore' : 'Chore';
          return (
            <div key={payout.completionId} className="flex items-center justify-between bg-slate-900/40 rounded px-3 py-2 text-sm">
              <span>
                {userName} • {choreName}
              </span>
              <span>${payout.amount.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
