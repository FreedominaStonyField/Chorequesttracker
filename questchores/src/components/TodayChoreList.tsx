import { Chore, CycleState, DailyChore, DailyRollover } from '../lib/models';
import { todayISO } from '../lib/dates';
import { isCompletedToday } from '../lib/cycles';

const today = todayISO();

type Props = {
  dateISO: string;
  baseChores: Chore[];
  dailyChores: DailyChore[];
  currentCycle: CycleState | null;
  rollovers: DailyRollover[];
  onComplete: (id: string) => void;
  onRecordRollover: (date: string) => void;
};

export default function TodayChoreList({
  dateISO,
  baseChores,
  dailyChores,
  currentCycle,
  rollovers,
  onComplete,
  onRecordRollover,
}: Props) {
  const choresForDate = dailyChores.filter((chore) => chore.scheduledDate === dateISO);
  const baseMap = new Map(baseChores.map((chore) => [chore.id, chore]));
  const totalAvailable = choresForDate.reduce((sum, chore) => sum + chore.finalPayout, 0);
  const unearned = choresForDate
    .filter((chore) => chore.status !== 'completed')
    .reduce((sum, chore) => sum + chore.finalPayout, 0);
  const rolloverLogged = rollovers.some((entry) => entry.cycleId === currentCycle?.id && entry.date === dateISO);

  return (
    <section className="bg-slate-800/60 rounded-lg p-4 space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Today's Chores</h2>
          <p className="text-sm text-slate-300">{dateISO === today ? 'Today' : dateISO}</p>
        </div>
        <div className="text-sm text-slate-200 flex flex-col gap-1 text-right">
          <span>
            Today's total available: <span className="text-amber-300">${totalAvailable.toFixed(2)}</span>
          </span>
          <span>
            Unearned so far: <span className="text-rose-300">${unearned.toFixed(2)}</span>
          </span>
          <button
            className="self-end px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onRecordRollover(dateISO)}
            disabled={!currentCycle || rolloverLogged}
          >
            {rolloverLogged ? 'Rollover recorded' : 'Record rollover'}
          </button>
        </div>
      </header>
      <div className="space-y-2">
        {choresForDate.length === 0 && (
          <p className="text-sm text-slate-400">No chores scheduled for this date.</p>
        )}
        {choresForDate.map((chore) => {
          const base = baseMap.get(chore.choreId);
          const completed = chore.status === 'completed';
          const completedToday = chore.completedAt
            ? isCompletedToday(chore, dateISO)
            : false;
          return (
            <div
              key={chore.id}
              className={`flex items-center justify-between rounded px-3 py-2 border border-slate-700 bg-slate-900/40 transition ${
                completed ? 'opacity-60 pointer-events-none' : 'hover:bg-slate-900/60'
              }`}
            >
              <div>
                <div className="font-medium text-sm">{base?.title ?? 'Chore'}</div>
                <div className="text-xs text-slate-400">Payout: ${chore.finalPayout.toFixed(2)}</div>
                {completed && completedToday && (
                  <div className="text-xs text-emerald-400 mt-1">Completed</div>
                )}
              </div>
              <button
                className="px-3 py-1 rounded bg-emerald-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => onComplete(chore.id)}
                disabled={completed}
              >
                {completed ? 'Done' : 'Complete'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
