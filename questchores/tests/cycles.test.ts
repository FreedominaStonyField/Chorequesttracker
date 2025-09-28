import { describe, expect, it } from 'vitest';
import { generateCycle, completeDailyChore, rolloverUnearned, isCompletedToday } from '../src/lib/cycles';
import { AppState, CycleState } from '../src/lib/models';

const baseState: AppState = {
  users: [],
  chores: [
    { id: 'chore1', title: 'Dishes', recurrence: 'daily', min: 9, mode: 10, max: 12, active: true },
  ],
  completions: [],
  payouts: [],
  currentCycle: null,
  dailyChores: [],
  dailyRollovers: [],
  config: {
    cycleDays: 3,
    cashPoolTotal: 60,
    startDateISO: '2024-03-09',
    seed: 'home-seed',
  },
};

describe('cycle generation and rollovers', () => {
  it('keeps payouts immutable after completion', () => {
    const { dailyChores } = generateCycle(baseState);
    const target = dailyChores[0];
    const completed = completeDailyChore(dailyChores, target.id, new Date('2024-03-09T23:59:59Z'));
    const after = completed.find((entry) => entry.id === target.id)!;
    expect(after.finalPayout).toBe(target.finalPayout);
  });

  it('schedules dates correctly across DST transitions', () => {
    const { dailyChores } = generateCycle({
      ...baseState,
      config: { ...baseState.config, cycleDays: 2, startDateISO: '2024-03-09' },
    });
    const dates = dailyChores.map((chore) => chore.scheduledDate);
    expect(dates).toEqual(['2024-03-09', '2024-03-10']);
  });

  it('treats completions near midnight as the correct day boundary', () => {
    const { dailyChores } = generateCycle(baseState);
    const target = dailyChores[0];
    const justBeforeMidnight = completeDailyChore(dailyChores, target.id, new Date('2024-03-09T23:59:59'));
    const justAfterMidnight = completeDailyChore(dailyChores, target.id, new Date('2024-03-10T00:00:01'));
    expect(isCompletedToday(justBeforeMidnight.find((c) => c.id === target.id)!, '2024-03-09')).toBe(true);
    expect(isCompletedToday(justAfterMidnight.find((c) => c.id === target.id)!, '2024-03-09')).toBe(false);
  });

  it('produces deterministic payouts with a fixed seed', () => {
    const first = generateCycle(baseState);
    const second = generateCycle(baseState);
    expect(first.dailyChores.map((c) => c.finalPayout)).toEqual(
      second.dailyChores.map((c) => c.finalPayout)
    );
  });

  it('rollover job is idempotent', () => {
    const generated = generateCycle(baseState);
    const firstRun = rolloverUnearned(
      generated.currentCycle!,
      generated.dailyChores,
      [],
      '2024-03-09',
      new Date('2024-03-10T00:00:00Z')
    );
    const secondRun = rolloverUnearned(
      firstRun.cycle,
      generated.dailyChores,
      firstRun.rollovers,
      '2024-03-09',
      new Date('2024-03-10T00:00:00Z')
    );
    expect(secondRun.cycle.rolloverPool).toBe(firstRun.cycle.rolloverPool);
    expect(secondRun.rollovers.length).toBe(firstRun.rollovers.length);
  });

  it('transfers rollover pool into the next cycle funding', () => {
    const generated = generateCycle(baseState);
    const rolloverApplied = rolloverUnearned(
      generated.currentCycle!,
      generated.dailyChores,
      [],
      '2024-03-09',
      new Date('2024-03-10T00:00:00Z')
    );
    const priorCycle: CycleState = { ...rolloverApplied.cycle };
    const nextState: AppState = {
      ...baseState,
      currentCycle: priorCycle,
      dailyRollovers: rolloverApplied.rollovers,
      config: { ...baseState.config, startDateISO: '2024-04-01', cashPoolTotal: 100 },
    };
    const nextCycle = generateCycle(nextState);
    expect(nextCycle.currentCycle?.rolloverFromPrior).toBeGreaterThan(0);
    expect(nextCycle.currentCycle?.fundingPool).toBeCloseTo(100 + priorCycle.rolloverPool, 2);
  });
});
