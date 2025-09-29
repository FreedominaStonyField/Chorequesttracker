import type {
  AdminSettings,
  ChoreTemplate,
  DailyChorePlan,
  QuestChore,
  RootState,
  UserId,
  UserStats,
} from './types';
import { PrismaClient } from '@prisma/client';

type StoredPlan = {
  id: number;
  cycleId: string;
  orderIndex: number;
  date: string;
  budget: number;
  unallocated: number;
  chores: StoredQuest[];
};

type StoredQuest = {
  id: number;
  orderIndex: number;
  questId: string;
  reward: number;
  completed: boolean;
  completedBy: string | null;
  completionTimestamp: string | null;
  templateId: string;
  templateTitle: string;
  templateDescription: string;
  templateMinPercent: number;
  templateMaxPercent: number;
};

const USER_IDS: UserId[] = ['fransisco', 'lewis', 'jero', 'saffire'];

function parseBudgets(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      const numeric = Number(entry);
      return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
    })
    .map((budget) => (budget < 0 ? 0 : budget));
}

function mapPlan(record: StoredPlan): DailyChorePlan {
  const chores: QuestChore[] = record.chores
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((entry) => ({
      id: entry.questId,
      reward: entry.reward,
      completed: entry.completed,
      completedBy: (entry.completedBy ?? undefined) as UserId | undefined,
      completionTimestamp: entry.completionTimestamp ?? undefined,
      template: {
        id: entry.templateId,
        title: entry.templateTitle,
        description: entry.templateDescription,
        minPercent: entry.templateMinPercent,
        maxPercent: entry.templateMaxPercent,
      },
    }));

  return {
    date: record.date,
    budget: record.budget,
    unallocated: record.unallocated,
    chores,
  };
}

function sanitizeTemplate(template: ChoreTemplate, orderIndex: number) {
  return {
    id: template.id,
    orderIndex,
    title: template.title,
    description: template.description,
    minPercent: template.minPercent,
    maxPercent: template.maxPercent,
  };
}

export class StateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async load(): Promise<RootState | null> {
    const appState = await this.prisma.appState.findUnique({ where: { id: 1 } });
    if (!appState?.cycleId) {
      return null;
    }

    const [settings, templates, profiles, cycle] = await Promise.all([
      this.prisma.adminSettings.findUnique({ where: { id: 1 } }),
      this.prisma.choreTemplate.findMany({ orderBy: { orderIndex: 'asc' } }),
      this.prisma.userProfile.findMany(),
      this.prisma.cycleState.findUnique({
        where: { cycleId: appState.cycleId },
        include: {
          dailyPlans: {
            orderBy: { orderIndex: 'asc' },
            include: { chores: { orderBy: { orderIndex: 'asc' } } },
          },
        },
      }),
    ]);

    if (!cycle) {
      return null;
    }

    const adminSettings: AdminSettings = {
      baseRewardPool: settings?.baseRewardPool ?? cycle.configBaseRewardPool ?? 0,
    };

    const choreLibrary: ChoreTemplate[] = templates.map((template) => ({
      id: template.id,
      title: template.title,
      description: template.description,
      minPercent: template.minPercent,
      maxPercent: template.maxPercent,
    }));

    const profileMap: Record<UserId, UserStats> = USER_IDS.reduce(
      (acc, id) => {
        const profile = profiles.find((entry) => entry.userId === id);
        acc[id] = {
          totalEarned: profile?.totalEarned ?? 0,
          totalCashedOut: profile?.totalCashedOut ?? 0,
        };
        return acc;
      },
      {} as Record<UserId, UserStats>,
    );

    const plans: DailyChorePlan[] = cycle.dailyPlans.map(mapPlan);

    const rootState: RootState = {
      activeUser: (appState.activeUser as UserId | null) ?? null,
      profiles: profileMap,
      cycle: {
        cycleId: cycle.cycleId,
        startDate: cycle.startDate,
        dayIndex: cycle.dayIndex,
        cycleLength: cycle.cycleLength,
        rewardPool: cycle.rewardPool,
        carryOverFromPreviousCycle: cycle.carryOverFromPreviousCycle,
        dailyBudgets: parseBudgets(cycle.dailyBudgets),
        dailyPlans: plans,
        config: adminSettings,
        librarySignature: cycle.librarySignature,
      },
      choreLibrary,
      adminSettings,
    };

    return rootState;
  }

  async save(state: RootState): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.adminSettings.upsert({
        where: { id: 1 },
        update: { baseRewardPool: state.adminSettings.baseRewardPool },
        create: { id: 1, baseRewardPool: state.adminSettings.baseRewardPool },
      });

      await tx.choreTemplate.deleteMany({});
      if (state.choreLibrary.length > 0) {
        await tx.choreTemplate.createMany({
          data: state.choreLibrary.map(sanitizeTemplate),
        });
      }

      const profileEntries = Object.entries(state.profiles) as Array<[
        UserId,
        UserStats,
      ]>;
      const knownUserIds = profileEntries.map(([id]) => id);

      await tx.userProfile.deleteMany({
        where: { userId: { notIn: knownUserIds } },
      });

      await Promise.all(
        profileEntries.map(([userId, stats]) =>
          tx.userProfile.upsert({
            where: { userId },
            update: {
              totalEarned: stats.totalEarned,
              totalCashedOut: stats.totalCashedOut,
            },
            create: {
              userId,
              totalEarned: stats.totalEarned,
              totalCashedOut: stats.totalCashedOut,
            },
          }),
        ),
      );

      await tx.cycleState.deleteMany({
        where: { cycleId: { not: state.cycle.cycleId } },
      });

      await tx.dailyChorePlan.deleteMany({
        where: { cycleId: state.cycle.cycleId },
      });

      await tx.cycleState.upsert({
        where: { cycleId: state.cycle.cycleId },
        update: {
          startDate: state.cycle.startDate,
          dayIndex: state.cycle.dayIndex,
          cycleLength: state.cycle.cycleLength,
          rewardPool: state.cycle.rewardPool,
          carryOverFromPreviousCycle: state.cycle.carryOverFromPreviousCycle,
          dailyBudgets: state.cycle.dailyBudgets,
          configBaseRewardPool: state.cycle.config.baseRewardPool,
          librarySignature: state.cycle.librarySignature,
        },
        create: {
          cycleId: state.cycle.cycleId,
          startDate: state.cycle.startDate,
          dayIndex: state.cycle.dayIndex,
          cycleLength: state.cycle.cycleLength,
          rewardPool: state.cycle.rewardPool,
          carryOverFromPreviousCycle: state.cycle.carryOverFromPreviousCycle,
          dailyBudgets: state.cycle.dailyBudgets,
          configBaseRewardPool: state.cycle.config.baseRewardPool,
          librarySignature: state.cycle.librarySignature,
        },
      });

      for (const [orderIndex, plan] of state.cycle.dailyPlans.entries()) {
        await tx.dailyChorePlan.create({
          data: {
            cycleId: state.cycle.cycleId,
            orderIndex,
            date: plan.date,
            budget: plan.budget,
            unallocated: plan.unallocated,
            chores: {
              create: plan.chores.map((chore, choreIndex) => ({
                orderIndex: choreIndex,
                questId: chore.id,
                reward: chore.reward,
                completed: chore.completed,
                completedBy: chore.completedBy ?? null,
                completionTimestamp: chore.completionTimestamp ?? null,
                templateId: chore.template.id,
                templateTitle: chore.template.title,
                templateDescription: chore.template.description,
                templateMinPercent: chore.template.minPercent,
                templateMaxPercent: chore.template.maxPercent,
              })),
            },
          },
        });
      }

      await tx.appState.upsert({
        where: { id: 1 },
        update: {
          activeUser: state.activeUser,
          cycleId: state.cycle.cycleId,
        },
        create: {
          id: 1,
          activeUser: state.activeUser,
          cycleId: state.cycle.cycleId,
        },
      });
    });
  }

  async clear(): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.questChore.deleteMany({}),
      this.prisma.dailyChorePlan.deleteMany({}),
      this.prisma.cycleState.deleteMany({}),
      this.prisma.choreTemplate.deleteMany({}),
      this.prisma.userProfile.deleteMany({}),
      this.prisma.adminSettings.deleteMany({}),
      this.prisma.appState.deleteMany({}),
    ]);
  }
}
