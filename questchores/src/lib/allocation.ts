import { AppState, Payout } from './models';
import { planDailyAllocation } from './simulate';

export type AllocationResult = {
  plan: ReturnType<typeof planDailyAllocation>;
  payoutsCreated: Payout[];
  nextState: AppState;
};

export function allocateForDate(state: AppState, dateISO: string): AllocationResult {
  const plan = planDailyAllocation(state, dateISO);
  if (!plan.entries.length) {
    return { plan, payoutsCreated: [], nextState: state };
  }

  const payoutsCreated: Payout[] = plan.entries
    .filter((entry) => entry.final > 0)
    .map((entry) => ({ completionId: entry.completion.id, amount: entry.final, dateISO }));

  if (!payoutsCreated.length) {
    return { plan, payoutsCreated: [], nextState: state };
  }

  const completionMap = new Map(state.completions.map((c) => [c.id, c]));

  const users = state.users.map((user) => {
    const earned = payoutsCreated.reduce((sum, payout) => {
      const completion = completionMap.get(payout.completionId);
      return completion && completion.userId === user.id ? sum + payout.amount : sum;
    }, 0);
    return earned ? { ...user, totalEarned: Math.round((user.totalEarned + earned) * 100) / 100 } : user;
  });

  const nextState: AppState = {
    ...state,
    users,
    payouts: [...state.payouts, ...payoutsCreated],
  };

  return { plan, payoutsCreated, nextState };
}
