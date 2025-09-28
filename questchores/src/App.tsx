import { useEffect, useMemo, useState } from 'react';
import CycleConfigForm from './components/CycleConfigForm';
import UsersPanel from './components/UsersPanel';
import ChoresPanel from './components/ChoresPanel';
import DayView from './components/DayView';
import Calendar from './components/Calendar';
import ImportExport from './components/ImportExport';
import { usePersistentAppState, defaultState } from './lib/storage';
import { AppState, Chore, Completion, CycleConfig, User } from './lib/models';
import { todayISO, dayIndex, withinCycle, cycleDayLabel } from './lib/dates';
import { allocateForDate } from './lib/allocation';
import { planDailyAllocation } from './lib/simulate';
import TodayChoreList from './components/TodayChoreList';
import { completeDailyChore, generateCycle, rolloverUnearned } from './lib/cycles';

const id = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

function clampCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export default function App() {
  const [state, setState] = usePersistentAppState();
  const [selectedDate, setSelectedDate] = useState(state.config.startDateISO || todayISO());

  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(todayISO());
    }
  }, [selectedDate]);

  useEffect(() => {
    setSelectedDate((prev) => prev || state.config.startDateISO || todayISO());
  }, [state.config.startDateISO]);

  useEffect(() => {
    if (!state.currentCycle) {
      setState((prev) => {
        if (prev.currentCycle) return prev;
        const generated = generateCycle(prev);
        return { ...prev, ...generated };
      });
    }
  }, [state.currentCycle, setState]);

  const updateConfig = (config: CycleConfig) => {
    setState((prev) => ({ ...prev, config }));
  };

  const remainingPool = useMemo(() => {
    const paid = state.payouts.filter((p) => withinCycle(p.dateISO, state.config)).reduce((sum, p) => sum + p.amount, 0);
    const funding = state.currentCycle?.fundingPool ?? state.config.cashPoolTotal;
    return Math.max(0, funding - paid);
  }, [state.payouts, state.config, state.currentCycle]);

  const cycleStatus = cycleDayLabel(selectedDate, state.config);

  const addUser = (name: string) => {
    const user: User = { id: id(), name, totalEarned: 0, totalCashedOut: 0 };
    setState((prev) => ({ ...prev, users: [...prev.users, user] }));
  };

  const renameUser = (userId: string, name: string) => {
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === userId ? { ...u, name } : u)),
    }));
  };

  const deleteUser = (userId: string) => {
    setState((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== userId),
      completions: prev.completions.filter((c) => c.userId !== userId),
      payouts: prev.payouts.filter((p) => {
        const completion = prev.completions.find((c) => c.id === p.completionId);
        return completion?.userId !== userId;
      }),
    }));
  };

  const cashout = (userId: string, amount: number) => {
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === userId
          ? { ...u, totalCashedOut: clampCurrency(Math.min(u.totalEarned, u.totalCashedOut + amount)) }
          : u
      ),
    }));
  };

  const addChore = (chore: Omit<Chore, 'id'>) => {
    setState((prev) => ({ ...prev, chores: [...prev.chores, { ...chore, id: id() }] }));
  };

  const updateChore = (choreId: string, patch: Partial<Chore>) => {
    setState((prev) => ({
      ...prev,
      chores: prev.chores.map((c) => (c.id === choreId ? { ...c, ...patch } : c)),
    }));
  };

  const deleteChore = (choreId: string) => {
    setState((prev) => ({
      ...prev,
      chores: prev.chores.filter((c) => c.id !== choreId),
      completions: prev.completions.filter((c) => c.choreId !== choreId),
      payouts: prev.payouts.filter((p) => {
        const completion = prev.completions.find((c) => c.id === p.completionId);
        return completion?.choreId !== choreId;
      }),
    }));
  };

  const addCompletion = (userId: string, choreId: string, dateISO: string) => {
    const completion: Completion = { id: id(), userId, choreId, dateISO };
    setState((prev) => ({ ...prev, completions: [...prev.completions, completion] }));
  };

  const removeCompletion = (completionId: string) => {
    setState((prev) => {
      const hasPayout = prev.payouts.some((p) => p.completionId === completionId);
      if (hasPayout) return prev;
      return { ...prev, completions: prev.completions.filter((c) => c.id !== completionId) };
    });
  };

  const allocate = (dateISO: string) => {
    const result = allocateForDate(state, dateISO);
    if (result.payoutsCreated.length) {
      setState(result.nextState);
    }
  };

  const resetCycle = () => {
    const freshUsers = state.users.map((u) => ({ ...u, totalEarned: 0, totalCashedOut: 0 }));
    setState((prev) => {
      const nextConfig = { ...prev.config, startDateISO: todayISO() };
      const base: AppState = {
        ...prev,
        users: freshUsers,
        config: nextConfig,
        completions: [],
        payouts: [],
        dailyChores: [],
        dailyRollovers: prev.dailyRollovers,
      } as AppState;
      const generated = generateCycle(base, nextConfig, nextConfig.startDateISO);
      return { ...base, ...generated };
    });
    setSelectedDate(todayISO());
  };

  const completeTodayChore = (dailyChoreId: string) => {
    setState((prev) => ({
      ...prev,
      dailyChores: completeDailyChore(prev.dailyChores, dailyChoreId, new Date()),
    }));
  };

  const recordRollover = (dateISO: string) => {
    setState((prev) => {
      if (!prev.currentCycle) return prev;
      const result = rolloverUnearned(prev.currentCycle, prev.dailyChores, prev.dailyRollovers, dateISO, new Date());
      if (result.rollovers === prev.dailyRollovers) return prev;
      return { ...prev, currentCycle: result.cycle, dailyRollovers: result.rollovers };
    });
  };

  const importState = (next: AppState) => {
    if (!next || typeof next !== 'object') return;
    setState({
      ...defaultState,
      ...next,
      config: { ...defaultState.config, ...next.config },
      currentCycle: next.currentCycle ?? null,
      dailyChores: next.dailyChores ?? [],
      dailyRollovers: next.dailyRollovers ?? [],
    });
  };

  const plan = planDailyAllocation(state, selectedDate);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 backdrop-blur bg-slate-900/80 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">QuestChores</h1>
            <p className="text-sm text-slate-300">{cycleStatus}</p>
          </div>
          <div className="text-sm text-slate-300 text-right">
            Remaining Pool: <span className="text-amber-300">${remainingPool.toFixed(2)}</span>
            <br />
            Today's plan: ${plan.totalFinal.toFixed(2)} across {plan.entries.length} quests
            <br />
            Rollover pool: <span className="text-sky-300">${(state.currentCycle?.rolloverPool ?? 0).toFixed(2)}</span>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <CycleConfigForm config={state.config} onChange={updateConfig} onReset={resetCycle} />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <UsersPanel
              users={state.users}
              onAdd={addUser}
              onRename={renameUser}
              onDelete={deleteUser}
              onCashout={cashout}
            />
            <ChoresPanel chores={state.chores} onAdd={addChore} onUpdate={updateChore} onDelete={deleteChore} />
          </div>
          <Calendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            completions={state.completions}
            payouts={state.payouts}
          />
        </div>
        <DayView
          dateISO={selectedDate}
          onDateChange={setSelectedDate}
          users={state.users}
          chores={state.chores}
          completions={state.completions}
          payouts={state.payouts}
          config={state.config}
          currentCycle={state.currentCycle}
          onAddCompletion={addCompletion}
          onRemoveCompletion={removeCompletion}
          onAllocate={allocate}
        />
        <TodayChoreList
          dateISO={selectedDate}
          baseChores={state.chores}
          dailyChores={state.dailyChores}
          currentCycle={state.currentCycle}
          rollovers={state.dailyRollovers}
          onComplete={completeTodayChore}
          onRecordRollover={recordRollover}
        />
        <ImportExport state={state} onImport={importState} />
      </main>
    </div>
  );
}
