import type { ChoreTemplate } from './data/choreLibrary';

export type AdminSettings = {
  baseRewardPool: number;
  dailyChoresCount: number;
  minChoreReward: number;
  maxChoreReward: number;
};

export type UserId = 'fransisco' | 'lewis' | 'jero' | 'saffire';

export type QuestChore = {
  id: string;
  template: ChoreTemplate;
  reward: number;
  revealed: boolean;
  completed: boolean;
  completedBy?: UserId;
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
  config: AdminSettings;
};

export type UserStats = {
  totalEarned: number;
  totalCashedOut: number;
};

export type RootState = {
  activeUser: UserId | null;
  profiles: Record<UserId, UserStats>;
  cycle: CycleState;
  choreLibrary: ChoreTemplate[];
  adminSettings: AdminSettings;
};
