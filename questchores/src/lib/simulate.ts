import { AppState, Completion, Payout } from './models';
import { dayIndex, withinCycle } from './dates';
import { hashToSeed, mulberry32 } from './rng';
import { triangular } from './triangular';

export type PlannedEntry = {
  completion: Completion;
  suggested: number;
  final: number;
};

export type AllocationPlan = {
  dailyBudget: number;
  remainingPool: number;
  remainingDays: number;
  totalSuggested: number;
  totalFinal: number;
  entries: PlannedEntry[];
};

const TWO_DEC = 100;

function floor2(v: number): number {
  return Math.floor(v * TWO_DEC) / TWO_DEC;
}

function round2(v: number): number {
  return Math.round(v * TWO_DEC) / TWO_DEC;
}

function sumPayouts(payouts: Payout[], predicate: (p: Payout) => boolean) {
  return payouts.reduce((acc, p) => (predicate(p) ? acc + p.amount : acc), 0);
}

export function planDailyAllocation(state: AppState, dateISO: string): AllocationPlan {
  const { config, completions, chores, payouts } = state;
  if (!config.startDateISO) {
    return { dailyBudget: 0, remainingPool: config.cashPoolTotal, remainingDays: 0, totalSuggested: 0, totalFinal: 0, entries: [] };
  }
  const idx = dayIndex(dateISO, config);
  if (!Number.isFinite(idx) || idx < 0 || idx >= config.cycleDays) {
    return { dailyBudget: 0, remainingPool: 0, remainingDays: 0, totalSuggested: 0, totalFinal: 0, entries: [] };
  }

  const payoutsBefore = sumPayouts(payouts, (p) => withinCycle(p.dateISO, config) && dayIndex(p.dateISO, config) < idx);
  const remainingPool = Math.max(0, config.cashPoolTotal - payoutsBefore);
  const remainingDays = Math.max(1, config.cycleDays - idx);
  const dailyBudget = floor2(remainingPool / remainingDays);

  const paidIds = new Set(payouts.filter((p) => p.dateISO === dateISO).map((p) => p.completionId));
  const dayCompletions = completions.filter((c) => c.dateISO === dateISO && !paidIds.has(c.id));
  const choreMap = new Map(chores.map((c) => [c.id, c]));

  const suggestions = dayCompletions.map((completion) => {
    const chore = choreMap.get(completion.choreId);
    if (!chore || !chore.active) return { completion, suggested: 0 };
    const seed = hashToSeed(`${config.seed}|${idx}|${completion.id}`);
    const rng = mulberry32(seed);
    const suggested = triangular(chore.min, chore.mode, chore.max, rng);
    return { completion, suggested };
  });

  const totalSuggested = suggestions.reduce((sum, { suggested }) => sum + suggested, 0);
  const factor = totalSuggested === 0 || totalSuggested <= dailyBudget ? 1 : dailyBudget / totalSuggested;

  const entries = suggestions.map(({ completion, suggested }) => ({
    completion,
    suggested,
    final: round2(suggested * factor),
  }));

  const totalFinal = entries.reduce((sum, e) => sum + e.final, 0);

  return { dailyBudget, remainingPool, remainingDays, totalSuggested, totalFinal, entries };
}

export { floor2, round2 };
