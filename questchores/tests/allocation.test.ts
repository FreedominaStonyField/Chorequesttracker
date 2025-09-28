import { describe, expect, it } from 'vitest';
import { planDailyAllocation } from '../src/lib/simulate';
import { AppState } from '../src/lib/models';

const baseState: AppState = {
  users: [
    { id: 'u1', name: 'A', totalEarned: 0, totalCashedOut: 0 },
    { id: 'u2', name: 'B', totalEarned: 0, totalCashedOut: 0 },
  ],
  chores: [
    { id: 'c1', title: 'Wash dishes', recurrence: 'daily', min: 5, mode: 10, max: 15, active: true },
    { id: 'c2', title: 'Vacuum', recurrence: 'weekly', min: 5, mode: 12, max: 18, active: true },
  ],
  completions: [
    { id: 'k1', userId: 'u1', choreId: 'c1', dateISO: '2024-01-01' },
    { id: 'k2', userId: 'u2', choreId: 'c2', dateISO: '2024-01-01' },
  ],
  payouts: [],
  currentCycle: null,
  dailyChores: [],
  dailyRollovers: [],
  config: {
    cycleDays: 10,
    cashPoolTotal: 100,
    startDateISO: '2024-01-01',
    seed: 'spec',
  },
};

describe('allocation', () => {
  it('scales down proportionally when suggestions exceed the budget', () => {
    const plan = planDailyAllocation(baseState, '2024-01-01');
    expect(plan.dailyBudget).toBe(10);
    expect(plan.totalSuggested).toBeGreaterThan(plan.dailyBudget);
    const ratio = plan.entries[0].final / plan.entries[0].suggested;
    plan.entries.slice(1).forEach((entry) => {
      const entryRatio = entry.final / entry.suggested;
      expect(Math.abs(entryRatio - ratio)).toBeLessThan(0.02);
    });
    const total = plan.entries.reduce((sum, e) => sum + e.final, 0);
    expect(Math.abs(total - plan.dailyBudget)).toBeLessThanOrEqual(0.05);
  });
});
