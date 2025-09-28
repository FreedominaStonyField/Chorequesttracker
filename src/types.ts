import type { ChoreTemplate } from './data/choreLibrary';

export type AdminSettings = {
  baseRewardPool: number;
  dailyChoresCount: number;
  minChoreReward: number;
  maxChoreReward: number;
};

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
  config: AdminSettings;
};

export type UserStats = {
  totalEarned: number;
  totalCashedOut: number;
};

export type ProfileState = {
  user: UserStats;
  cycle: CycleState;
  lastAccessDate: string; // ISO date
};

export type UserId = 'fransisco' | 'lewis' | 'jero' | 'saffire';

export type RootState = {
  activeUser: UserId | null;
  profiles: Record<UserId, ProfileState>;
  choreLibrary: ChoreTemplate[];
  adminSettings: AdminSettings;
};
