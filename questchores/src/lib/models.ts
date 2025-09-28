export type User = { id: string; name: string; totalEarned: number; totalCashedOut: number };
export type Chore = {
  id: string;
  title: string;
  recurrence: 'daily' | 'weekly' | 'custom';
  min: number;
  mode: number;
  max: number;
  active: boolean;
};
export type CycleConfig = {
  cycleDays: number;
  cashPoolTotal: number;
  startDateISO: string;
  seed: string;
};
export type Completion = { id: string; userId: string; choreId: string; dateISO: string };
export type Payout = { completionId: string; amount: number; dateISO: string };
export type AppState = {
  users: User[];
  chores: Chore[];
  config: CycleConfig;
  completions: Completion[];
  payouts: Payout[];
};
