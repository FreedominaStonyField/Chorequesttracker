import type { ChoreTemplate } from './data/choreLibrary';

export type QuestChore = {
  id: string;
  template: ChoreTemplate;
  reward: number;
  revealed: boolean;
  completed: boolean;
  completionTimestamp?: string;
};

export type CycleState = {
  cycleId: string;
  startDate: string; // ISO date (yyyy-mm-dd)
  dayIndex: number; // 0-based position in cycle
  cycleLength: number;
  rewardPool: number;
  carryOverFromPreviousCycle: number;
  unclaimedThisCycle: number;
  dailyBudgets: number[];
  chores: QuestChore[];
};

export type UserStats = {
  totalEarned: number;
  totalCashedOut: number;
};

export type AppState = {
  user: UserStats;
  cycle: CycleState;
  lastAccessDate: string; // ISO date
};
