import {
  AppState,
  Chore,
  CycleConfig,
  CycleState,
  DailyChore,
  DailyRollover,
} from './models';
import { addDays, todayISO, toDateOnlyISO } from './dates';
import { hashToSeed, mulberry32 } from './rng';

const VARIANCE = 0.1;

const runtimeCrypto: typeof crypto | undefined =
  typeof globalThis !== 'undefined' && 'crypto' in globalThis ? (globalThis.crypto as typeof crypto) : undefined;

function createId(): string {
  if (runtimeCrypto && 'randomUUID' in runtimeCrypto) {
    return runtimeCrypto.randomUUID();
  }
  return `chore_${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function recurrenceAllows(chore: Chore, dayIndex: number): boolean {
  switch (chore.recurrence) {
    case 'daily':
      return true;
    case 'weekly':
      return dayIndex % 7 === 0;
    default:
      return true;
  }
}

function makeCycleId(seed: string, start: string) {
  return `${seed}-${start}`;
}

export function generateCycle(
  state: AppState,
  config: CycleConfig = state.config,
  startDateISO: string = config.startDateISO || todayISO()
): Pick<AppState, 'currentCycle' | 'dailyChores'> {
  const prior = state.currentCycle;
  const rolloverFromPrior = prior?.rolloverPool ?? 0;
  const fundingPool = round2(config.cashPoolTotal + rolloverFromPrior);
  const startDate = toDateOnlyISO(new Date(startDateISO));
  const endDate = toDateOnlyISO(addDays(new Date(startDate), config.cycleDays - 1));
  const seed = config.seed || 'cycle';
  const cycleId = makeCycleId(seed, startDate);

  const cycle: CycleState = {
    id: cycleId,
    startDateISO: startDate,
    endDateISO: endDate,
    fundingPool,
    rolloverFromPrior: rolloverFromPrior,
    rolloverPool: 0,
    seed,
  };

  const activeChores = state.chores.filter((chore) => chore.active);
  const generatorSeed = hashToSeed(`${cycle.seed}|${cycle.id}`);
  const rng = mulberry32(generatorSeed);

  const dailyChores: DailyChore[] = [];
  for (let day = 0; day < config.cycleDays; day += 1) {
    const scheduledDate = toDateOnlyISO(addDays(new Date(startDate), day));
    for (const chore of activeChores) {
      if (!recurrenceAllows(chore, day)) continue;
      const base = chore.mode;
      const variance = (rng() * 2 - 1) * VARIANCE;
      const payout = round2(clamp(base * (1 + variance), chore.min, chore.max));
      dailyChores.push({
        id: createId(),
        cycleId: cycle.id,
        choreId: chore.id,
        scheduledDate,
        status: 'pending',
        finalPayout: payout,
      });
    }
  }

  return { currentCycle: cycle, dailyChores };
}

export function completeDailyChore(
  chores: DailyChore[],
  choreId: string,
  completedAt: Date = new Date()
): DailyChore[] {
  return chores.map((chore) =>
    chore.id === choreId
      ? {
          ...chore,
          status: 'completed',
          completedAt: new Date(completedAt).toISOString(),
        }
      : chore
  );
}

export function choresForDate(chores: DailyChore[], dateISO: string) {
  return chores.filter((chore) => chore.scheduledDate === dateISO);
}

export function isCompletedToday(chore: DailyChore, today: string) {
  if (chore.status !== 'completed' || !chore.completedAt) return false;
  return toDateOnlyISO(new Date(chore.completedAt)) === today;
}

export function rolloverUnearned(
  cycle: CycleState,
  chores: DailyChore[],
  rollovers: DailyRollover[],
  dateISO: string,
  now: Date = new Date()
): { cycle: CycleState; rollovers: DailyRollover[] } {
  const exists = rollovers.some((entry) => entry.cycleId === cycle.id && entry.date === dateISO);
  if (exists) {
    return { cycle, rollovers };
  }
  const unearned = chores
    .filter((chore) => chore.scheduledDate === dateISO && chore.status !== 'completed')
    .reduce((sum, chore) => sum + chore.finalPayout, 0);
  if (unearned === 0) {
    const entry: DailyRollover = {
      cycleId: cycle.id,
      date: dateISO,
      unearnedAmount: 0,
      createdAt: new Date(now).toISOString(),
    };
    return {
      cycle,
      rollovers: [...rollovers, entry],
    };
  }
  const entry: DailyRollover = {
    cycleId: cycle.id,
    date: dateISO,
    unearnedAmount: round2(unearned),
    createdAt: new Date(now).toISOString(),
  };
  return {
    cycle: { ...cycle, rolloverPool: round2(cycle.rolloverPool + entry.unearnedAmount) },
    rollovers: [...rollovers, entry],
  };
}

