export type AdminSettings = {
  baseRewardPool: number;
};

export type UserId = 'fransisco' | 'lewis' | 'jero' | 'saffire';

export type ChoreTemplate = {
  id: string;
  title: string;
  description: string;
  minPercent: number;
  maxPercent: number;
};

export type QuestChore = {
  id: string;
  template: ChoreTemplate;
  reward: number;
  completed: boolean;
  completedBy?: UserId;
  completionTimestamp?: string;
};

export type DailyChorePlan = {
  date: string;
  budget: number;
  unallocated: number;
  chores: QuestChore[];
};

export type CycleState = {
  cycleId: string;
  startDate: string;
  dayIndex: number;
  cycleLength: number;
  rewardPool: number;
  carryOverFromPreviousCycle: number;
  dailyBudgets: number[];
  dailyPlans: DailyChorePlan[];
  config: AdminSettings;
  librarySignature: string;
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
