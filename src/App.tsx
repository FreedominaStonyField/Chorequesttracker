import { useEffect, useMemo, useState, type FormEvent } from 'react';
import './App.css';
import { DEFAULT_CHORE_LIBRARY, type ChoreTemplate } from './data/choreLibrary';
import type {
  AdminSettings,
  CycleState,
  DailyChorePlan,
  QuestChore,
  RootState,
  UserId,
  UserStats,
} from './types';
import { randomIntPartition } from './utils/random';
import { loadState, saveState } from './utils/storage';
import { addDays, daysBetween, todayISO } from './utils/dates';

const CYCLE_LENGTH_DAYS = 1;

const DEFAULT_SETTINGS: AdminSettings = {
  baseRewardPool: 500,
};

const USERS: { id: UserId; name: string }[] = [
  { id: 'fransisco', name: 'Fransisco' },
  { id: 'lewis', name: 'Lewis' },
  { id: 'jero', name: 'Jero' },
  { id: 'saffire', name: 'Saffire' },
];

const USER_NAMES: Record<UserId, string> = USERS.reduce(
  (acc, user) => ({ ...acc, [user.id]: user.name }),
  {} as Record<UserId, string>,
);

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const formatCash = (amount: number) => currencyFormatter.format(amount);

const generateId = () => Math.random().toString(36).slice(2, 10);

const coerceNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'chore';

const cloneSettings = (settings: AdminSettings): AdminSettings => ({ ...settings });

const sanitizeSettings = (
  settings?: Partial<AdminSettings> | null,
): AdminSettings => {
  const base = settings ?? DEFAULT_SETTINGS;
  const baseRewardPool = Math.max(
    0,
    Math.floor(Number((base as Record<string, unknown>).baseRewardPool) || 0),
  );

  return {
    baseRewardPool,
  };
};

const toPercent = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(100, Math.max(0, Math.round(numeric * 100) / 100));
};

const sanitizeChoreLibrary = (
  library?: readonly Partial<ChoreTemplate>[] | null,
): ChoreTemplate[] => {
  const source = library && library.length > 0 ? library : DEFAULT_CHORE_LIBRARY;
  return source.map((entry, index) => {
    const idSource = (entry?.id ?? '').toString().trim();
    const fallbackId = `chore-${index}`;
    const minPercent = toPercent(
      entry?.minPercent,
      DEFAULT_CHORE_LIBRARY[index % DEFAULT_CHORE_LIBRARY.length]?.minPercent ?? 0,
    );
    const maxPercent = Math.max(
      minPercent,
      toPercent(
        entry?.maxPercent,
        DEFAULT_CHORE_LIBRARY[index % DEFAULT_CHORE_LIBRARY.length]?.maxPercent ?? minPercent,
      ),
    );

    return {
      id: idSource.length > 0 ? idSource : fallbackId,
      title:
        (entry?.title ?? '').toString().trim().length > 0
          ? (entry?.title ?? '').toString().trim()
          : `Chore ${index + 1}`,
      description: (entry?.description ?? '').toString().trim(),
      minPercent,
      maxPercent,
    };
  });
};

const cloneChoreLibrary = (library: readonly ChoreTemplate[]): ChoreTemplate[] =>
  library.map((entry) => ({ ...entry }));

const getLibrarySignature = (library: readonly ChoreTemplate[]): string =>
  library
    .map(
      (chore) =>
        `${chore.id}|${chore.title}|${chore.description}|${chore.minPercent}|${chore.maxPercent}`,
    )
    .join('::');

type AllocationResult = {
  rewards: number[];
  unallocated: number;
};

type RewardPopup = {
  id: string;
  amount: number;
  label: string;
};

function allocateRewardsForChores(
  budget: number,
  templates: readonly ChoreTemplate[],
): AllocationResult {
  if (budget <= 0 || templates.length === 0) {
    return {
      rewards: templates.map(() => 0),
      unallocated: Math.max(0, budget),
    };
  }

  const entries = templates.map((template) => {
    const minAmount = Math.floor((template.minPercent / 100) * budget);
    const maxAmount = Math.floor((template.maxPercent / 100) * budget);
    const safeMax = Math.max(minAmount, maxAmount);
    return {
      minAmount,
      maxAmount: safeMax,
      allocated: 0,
    };
  });

  let minTotal = entries.reduce((sum, entry) => sum + entry.minAmount, 0);

  if (minTotal > budget) {
    const scale = budget / (minTotal || 1);
    minTotal = 0;
    entries.forEach((entry) => {
      const scaledMin = Math.floor(entry.minAmount * scale);
      const scaledMax = Math.max(scaledMin, Math.floor(entry.maxAmount * scale));
      entry.minAmount = scaledMin;
      entry.maxAmount = scaledMax;
      minTotal += scaledMin;
    });
  }

  const totalFlex = entries.reduce(
    (sum, entry) => sum + Math.max(entry.maxAmount - entry.minAmount, 0),
    0,
  );
  const available = Math.max(0, budget - minTotal);
  const usableExtra = Math.min(available, totalFlex);

  const weights = entries.map(() => Math.random());
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0) || 1;

  entries.forEach((entry, index) => {
    const flexCapacity = Math.max(entry.maxAmount - entry.minAmount, 0);
    if (flexCapacity <= 0) {
      entry.allocated = entry.minAmount;
      return;
    }
    const share = Math.floor((weights[index] / weightTotal) * usableExtra);
    entry.allocated = entry.minAmount + Math.min(flexCapacity, share);
  });

  let distributedExtra = entries.reduce(
    (sum, entry) => sum + (entry.allocated - entry.minAmount),
    0,
  );
  let remainder = usableExtra - distributedExtra;

  while (remainder > 0) {
    let progressed = false;
    for (const entry of entries) {
      const flexCapacity = Math.max(entry.maxAmount - entry.minAmount, 0);
      const used = entry.allocated - entry.minAmount;
      const remainingFlex = flexCapacity - used;
      if (remainingFlex <= 0) continue;
      entry.allocated += 1;
      remainder -= 1;
      progressed = true;
      if (remainder <= 0) break;
    }
    if (!progressed) break;
  }

  const totalAllocated = entries.reduce((sum, entry) => sum + entry.allocated, 0);
  const unallocated = Math.max(0, budget - totalAllocated);

  return {
    rewards: entries.map((entry) => entry.allocated),
    unallocated,
  };
}

function shuffleTemplates(source: readonly ChoreTemplate[]): ChoreTemplate[] {
  const templates = [...source];
  for (let index = templates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [templates[index], templates[swapIndex]] = [templates[swapIndex], templates[index]];
  }
  return templates;
}

function generateDailyPlan(
  date: string,
  budget: number,
  library: readonly ChoreTemplate[],
): DailyChorePlan {
  if (library.length === 0) {
    return {
      date,
      budget,
      unallocated: budget,
      chores: [],
    };
  }

  const templates = shuffleTemplates(library);
  const { rewards, unallocated } = allocateRewardsForChores(budget, templates);

  const chores: QuestChore[] = templates.map((template, index) => ({
    id: `${template.id}-${generateId()}`,
    template,
    reward: rewards[index] ?? 0,
    completed: false,
  }));

  return {
    date,
    budget,
    unallocated,
    chores,
  };
}

function createCycle(
  startDate: string,
  carryOver: number,
  library: readonly ChoreTemplate[],
  settings: AdminSettings,
): CycleState {
  const rewardPool = settings.baseRewardPool + carryOver;
  const dailyBudgets = randomIntPartition(rewardPool, CYCLE_LENGTH_DAYS, 0);
  const dailyPlans: DailyChorePlan[] = dailyBudgets.map((budget, index) =>
    generateDailyPlan(addDays(startDate, index), budget, library),
  );

  return {
    cycleId: `${startDate}-${generateId()}`,
    startDate,
    dayIndex: 0,
    cycleLength: CYCLE_LENGTH_DAYS,
    rewardPool,
    carryOverFromPreviousCycle: carryOver,
    dailyBudgets,
    dailyPlans,
    config: cloneSettings(settings),
    librarySignature: getLibrarySignature(library),
  };
}

function computeCarryOver(cycle: CycleState): number {
  const plans = Array.isArray(cycle.dailyPlans) ? cycle.dailyPlans : [];
  return plans.reduce((sum, plan) => {
    const chores = Array.isArray(plan.chores) ? plan.chores : [];
    const incompleteRewards = chores
      .filter((chore) => !chore.completed)
      .reduce((acc, chore) => acc + chore.reward, 0);
    return sum + incompleteRewards + (plan.unallocated ?? 0);
  }, cycle.carryOverFromPreviousCycle ?? 0);
}

function settingsChanged(a: AdminSettings, b: AdminSettings): boolean {
  return a.baseRewardPool !== b.baseRewardPool;
}

function synchronizeCycleState(
  base: CycleState | null,
  today: string,
  library: readonly ChoreTemplate[],
  settings: AdminSettings,
): CycleState {
  if (!base) {
    return createCycle(today, 0, library, settings);
  }

  if (!Array.isArray(base.dailyPlans) || base.dailyPlans.length !== base.cycleLength) {
    const fallbackCarry =
      Math.max(0, Number((base as Record<string, unknown>)?.['carryOverFromPreviousCycle']) || 0) +
      Math.max(0, Number((base as Record<string, unknown>)?.['unclaimedThisCycle']) || 0);
    return createCycle(today, fallbackCarry, library, settings);
  }

  const signature = getLibrarySignature(library);

  const cycle: CycleState = {
    ...base,
    dailyBudgets: [...base.dailyBudgets],
    dailyPlans: base.dailyPlans.map((plan) => ({
      ...plan,
      chores: plan.chores.map((chore) => ({ ...chore })),
    })),
    config: cloneSettings(base.config ?? settings),
    librarySignature: base.librarySignature ?? signature,
  };

  if (cycle.cycleLength !== CYCLE_LENGTH_DAYS) {
    const carryOver = computeCarryOver(cycle);
    return createCycle(today, carryOver, library, settings);
  }

  cycle.cycleLength = CYCLE_LENGTH_DAYS;

  if (settingsChanged(cycle.config, settings) || cycle.librarySignature !== signature) {
    const carryOver = computeCarryOver(cycle);
    return createCycle(today, carryOver, library, settings);
  }

  cycle.config = cloneSettings(settings);
  cycle.librarySignature = signature;

  const daysSinceStart = daysBetween(cycle.startDate, today);

  if (daysSinceStart < 0) {
    return createCycle(today, 0, library, settings);
  }

  if (daysSinceStart >= cycle.cycleLength) {
    const carryOver = computeCarryOver(cycle);
    return createCycle(today, carryOver, library, settings);
  }

  const nextDayIndex = Math.min(daysSinceStart, cycle.cycleLength - 1);
  return {
    ...cycle,
    dayIndex: nextDayIndex,
  };
}

function synchronizeRootState(base: RootState | null, today: string): RootState {
  const adminSettings = sanitizeSettings(base?.adminSettings ?? null);
  const choreLibrary = cloneChoreLibrary(
    sanitizeChoreLibrary(base?.choreLibrary ?? null),
  );

  const profiles = USERS.reduce<Record<UserId, UserStats>>((acc, user) => {
    const existing = base?.profiles?.[user.id] ?? null;
    const record = (existing ?? {}) as Record<string, unknown> & {
      user?: Record<string, unknown>;
    };

    const hasDirectEarned = Object.prototype.hasOwnProperty.call(record, 'totalEarned');
    const hasDirectCashedOut = Object.prototype.hasOwnProperty.call(record, 'totalCashedOut');

    const earned = hasDirectEarned
      ? coerceNumber(record.totalEarned)
      : coerceNumber(record.user?.['totalEarned']);
    const cashedOut = hasDirectCashedOut
      ? coerceNumber(record.totalCashedOut)
      : coerceNumber(record.user?.['totalCashedOut']);

    acc[user.id] = { totalEarned: earned, totalCashedOut: cashedOut };
    return acc;
  }, {} as Record<UserId, UserStats>);

  const cycle = synchronizeCycleState(
    base?.cycle ?? null,
    today,
    choreLibrary,
    adminSettings,
  );

  const activeUser = base?.activeUser && profiles[base.activeUser] ? base.activeUser : null;

  return {
    activeUser,
    profiles,
    cycle,
    choreLibrary,
    adminSettings,
  };
}

function App() {
  const [state, setState] = useState<RootState | null>(null);
  const [popups, setPopups] = useState<RewardPopup[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<AdminSettings>(
    cloneSettings(DEFAULT_SETTINGS),
  );
  const [choreDrafts, setChoreDrafts] = useState<ChoreTemplate[]>(
    cloneChoreLibrary(DEFAULT_CHORE_LIBRARY),
  );
  const [newChoreTitle, setNewChoreTitle] = useState('');
  const [newChoreDescription, setNewChoreDescription] = useState('');
  const [newChoreMinPercent, setNewChoreMinPercent] = useState(5);
  const [newChoreMaxPercent, setNewChoreMaxPercent] = useState(15);

  useEffect(() => {
    const today = todayISO();
    const stored = loadState();
    setState(synchronizeRootState(stored, today));
  }, []);

  useEffect(() => {
    if (!state) return;
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (!state) return;
    setSettingsDraft(cloneSettings(state.adminSettings));
    setChoreDrafts(cloneChoreLibrary(state.choreLibrary));
  }, [state]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setState((current) => synchronizeRootState(current, todayISO()));
    }, 1000 * 60 * 5);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setState((current) => synchronizeRootState(current, todayISO()));
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const activeUserId = state?.activeUser ?? null;
  const activeStats = activeUserId ? state?.profiles[activeUserId] : null;

  const settingsDirty = useMemo(() => {
    if (!state) return false;
    const sanitizedDraft = sanitizeSettings(settingsDraft);
    return settingsChanged(sanitizedDraft, state.adminSettings);
  }, [settingsDraft, state]);

  const librariesEqual = (
    a: readonly ChoreTemplate[],
    b: readonly ChoreTemplate[],
  ): boolean => {
    if (a.length !== b.length) return false;
    for (let index = 0; index < a.length; index += 1) {
      const left = a[index];
      const right = b[index];
      if (
        left.id !== right.id ||
        left.title !== right.title ||
        left.description !== right.description ||
        left.minPercent !== right.minPercent ||
        left.maxPercent !== right.maxPercent
      ) {
        return false;
      }
    }
    return true;
  };

  const choresDirty = useMemo(() => {
    if (!state) return false;
    const sanitizedDraft = sanitizeChoreLibrary(choreDrafts);
    return !librariesEqual(sanitizedDraft, state.choreLibrary);
  }, [choreDrafts, state]);

  const hasUnsavedAdminChanges = showAdmin && (settingsDirty || choresDirty);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedAdminChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };

    if (hasUnsavedAdminChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedAdminChanges]);

  const handleToggleAdmin = () => {
    if (showAdmin) {
      if (hasUnsavedAdminChanges) {
        const confirmLeave = window.confirm(
          'You have unsaved admin changes. Save before leaving or confirm to discard.',
        );
        if (!confirmLeave) {
          return;
        }
      }
      setShowAdmin(false);
    } else {
      setShowAdmin(true);
    }
  };

  const handleSelectUser = (userId: UserId) => {
    setState((current) => {
      if (!current) return current;
      const synced = synchronizeRootState(current, todayISO());
      return { ...synced, activeUser: userId };
    });
  };

  const applyAdminSettings = (nextSettings: AdminSettings) => {
    setState((current) => {
      if (!current) return current;
      const sanitized = sanitizeSettings(nextSettings);
      const updated: RootState = {
        ...current,
        adminSettings: cloneSettings(sanitized),
      };
      return synchronizeRootState(updated, todayISO());
    });
  };

  const applyChoreLibrary = (nextLibrary: ChoreTemplate[]) => {
    setState((current) => {
      if (!current) return current;
      const sanitizedLibrary = cloneChoreLibrary(sanitizeChoreLibrary(nextLibrary));
      const updated: RootState = {
        ...current,
        choreLibrary: sanitizedLibrary,
      };
      return synchronizeRootState(updated, todayISO());
    });
  };

  const handleSettingsFieldChange = (field: keyof AdminSettings, value: number) => {
    setSettingsDraft((currentDraft) => {
      const sanitizedValue = Number.isNaN(value) ? 0 : value;
      const safeValue = Math.max(0, Math.floor(sanitizedValue));
      return {
        ...currentDraft,
        [field]: safeValue,
      };
    });
  };

  const handleChoreFieldChange = (
    id: string,
    field: 'title' | 'description',
    value: string,
  ) => {
    setChoreDrafts((currentDrafts) =>
      currentDrafts.map((chore) =>
        chore.id === id ? { ...chore, [field]: value } : chore,
      ),
    );
  };

  const handleChorePercentChange = (
    id: string,
    field: 'minPercent' | 'maxPercent',
    value: number,
  ) => {
    setChoreDrafts((currentDrafts) =>
      currentDrafts.map((chore) => {
        if (chore.id !== id) return chore;
        const numeric = Number.isNaN(value) ? 0 : value;
        const safeValue = Math.min(100, Math.max(0, Math.round(numeric * 100) / 100));
        if (field === 'minPercent') {
          const updatedMin = safeValue;
          return {
            ...chore,
            minPercent: updatedMin,
            maxPercent: Math.max(updatedMin, chore.maxPercent),
          };
        }
        const updatedMax = safeValue;
        return {
          ...chore,
          maxPercent: updatedMax,
          minPercent: Math.min(chore.minPercent, updatedMax),
        };
      }),
    );
  };

  const handleRemoveChore = (id: string) => {
    setChoreDrafts((currentDrafts) => currentDrafts.filter((chore) => chore.id !== id));
  };

  const handleResetChoreLibrary = () => {
    const confirmReset = window.confirm('Reset the chore library to defaults?');
    if (!confirmReset) return;
    const defaults = cloneChoreLibrary(DEFAULT_CHORE_LIBRARY);
    setChoreDrafts(defaults);
    applyChoreLibrary(defaults);
  };

  const handleSaveChoreLibrary = () => {
    applyChoreLibrary(choreDrafts);
  };

  const handleSaveSettings = () => {
    applyAdminSettings(settingsDraft);
  };

  const handleCreateChore = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newChoreTitle.trim();
    if (!title) return;
    const description = newChoreDescription.trim();
    const minPercent = Math.min(100, Math.max(0, Number(newChoreMinPercent) || 0));
    const maxPercent = Math.min(100, Math.max(minPercent, Number(newChoreMaxPercent) || minPercent));
    const baseId = slugify(title);
    const uniqueId = `${baseId}-${generateId()}`;

    const newChore: ChoreTemplate = {
      id: uniqueId,
      title,
      description,
      minPercent,
      maxPercent,
    };

    setChoreDrafts((current) => [...current, newChore]);
    setNewChoreTitle('');
    setNewChoreDescription('');
    setNewChoreMinPercent(5);
    setNewChoreMaxPercent(15);
  };

  const handleComplete = (choreId: string) => {
    let newPopup: RewardPopup | null = null;
    setState((current) => {
      const actor = current?.activeUser;
      if (!current || !actor) return current;
      const plan = current.cycle.dailyPlans[current.cycle.dayIndex];
      if (!plan) return current;
      const target = plan.chores.find((chore) => chore.id === choreId);
      if (!target || target.completed) return current;

      const updatedChores = plan.chores.map((chore) =>
        chore.id === choreId
          ? {
              ...chore,
              completed: true,
              completedBy: actor,
              completionTimestamp: new Date().toISOString(),
            }
          : chore,
      );

      newPopup = {
        id: generateId(),
        amount: target.reward,
        label: target.template.title,
      };

      return {
        ...current,
        profiles: {
          ...current.profiles,
          [actor]: {
            ...current.profiles[actor],
            totalEarned: current.profiles[actor].totalEarned + target.reward,
          },
        },
        cycle: {
          ...current.cycle,
          dailyPlans: current.cycle.dailyPlans.map((planEntry, index) =>
            index === current.cycle.dayIndex
              ? {
                  ...planEntry,
                  chores: updatedChores,
                }
              : planEntry,
          ),
        },
      };
    });

    if (newPopup) {
      const popup: RewardPopup = newPopup;
      setPopups((current) => [...current, popup]);
      window.setTimeout(() => {
        setPopups((current) => current.filter((entry) => entry.id !== popup.id));
      }, 2200);
    }
  };

  const handleCashOut = (amount: number) => {
    setState((current) => {
      const actor = current?.activeUser;
      if (!current || !actor) return current;
      const stats = current.profiles[actor];
      const available = Math.max(0, stats.totalEarned - stats.totalCashedOut);
      const value = Math.min(amount, available);
      if (value <= 0) return current;
      return {
        ...current,
        profiles: {
          ...current.profiles,
          [actor]: {
            ...stats,
            totalCashedOut: stats.totalCashedOut + value,
          },
        },
      };
    });
  };

  const handleResetWallet = () => {
    const confirmReset = window.confirm('Reset your earnings for this profile?');
    if (!confirmReset) return;
    setState((current) => {
      const actor = current?.activeUser;
      if (!current || !actor) return current;
      return {
        ...current,
        profiles: {
          ...current.profiles,
          [actor]: { totalEarned: 0, totalCashedOut: 0 },
        },
      };
    });
    setPopups([]);
  };

  if (!state) {
    return (
      <div className="app-loading">
        <p>Summoning quests...</p>
      </div>
    );
  }

  if (showAdmin) {
    const sanitizedDraft = sanitizeChoreLibrary(choreDrafts);
    const dailyRewardBudget = settingsDraft.baseRewardPool;

    return (
      <div className="app admin-app">
        <header className="hero admin-hero">
          <div className="hero__top">
            <h1>Admin Control Center</h1>
            <button type="button" className="ghost-button" onClick={handleToggleAdmin}>
              Back to quests
            </button>
          </div>
          <p>Update the shared chore deck and reward pool. Save changes before leaving.</p>
          {(settingsDirty || choresDirty) && (
            <p className="admin-warning">You have unsaved changes. Save to apply them.</p>
          )}
        </header>

        <section className="admin-grid">
          <article className="admin-card">
            <h2>Reward Pool</h2>
            <label className="admin-field">
              Base reward pool per cycle
              <input
                type="number"
                min={0}
                step={5}
                value={settingsDraft.baseRewardPool}
                onChange={(event) =>
                  handleSettingsFieldChange(
                    'baseRewardPool',
                    Number.isNaN(Number(event.target.value))
                      ? 0
                      : Number(event.target.value),
                  )
                }
              />
            </label>
            <p className="section-note">
              All chores in the library appear on the daily quest board for every player.
            </p>
            <button type="button" className="primary-button" onClick={handleSaveSettings}>
              Save reward settings
            </button>
          </article>

          <article className="admin-card admin-card--summary">
            <h2>Payout Forecast</h2>
            <p>
              Daily reward budget: <strong>{formatCash(dailyRewardBudget)}</strong>
            </p>
            <div className="admin-summary-table">
              <div className="admin-summary-row admin-summary-row--header">
                <span>Chore</span>
                <span>Min</span>
                <span>Max</span>
                <span>Avg</span>
              </div>
              {sanitizedDraft.map((chore) => {
                const minValue = (chore.minPercent / 100) * dailyRewardBudget;
                const maxValue = (chore.maxPercent / 100) * dailyRewardBudget;
                const avgValue = ((chore.minPercent + chore.maxPercent) / 200) * dailyRewardBudget;
                return (
                  <div key={chore.id} className="admin-summary-row">
                    <span>{chore.title}</span>
                    <span>{formatCash(minValue)}</span>
                    <span>{formatCash(maxValue)}</span>
                    <span>{formatCash(avgValue)}</span>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <section className="admin-chores">
          <div className="section-heading">
            <h2>Chore Library</h2>
            <span className="section-note">
              Adjust each quest card and its reward range. Save changes before navigating away.
            </span>
          </div>
          <div className="admin-chores-list">
            {choreDrafts.map((chore) => (
              <div key={chore.id} className="admin-chore-row">
                <div className="admin-chore-fields">
                  <label>
                    Title
                    <input
                      type="text"
                      value={chore.title}
                      onChange={(event) =>
                        handleChoreFieldChange(chore.id, 'title', event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      value={chore.description}
                      onChange={(event) =>
                        handleChoreFieldChange(chore.id, 'description', event.target.value)
                      }
                    />
                  </label>
                  <div className="admin-percent-grid">
                    <label>
                      Min % of pool
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={chore.minPercent}
                        onChange={(event) =>
                          handleChorePercentChange(
                            chore.id,
                            'minPercent',
                            Number(event.target.value),
                          )
                        }
                      />
                    </label>
                    <label>
                      Max % of pool
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={chore.maxPercent}
                        onChange={(event) =>
                          handleChorePercentChange(
                            chore.id,
                            'maxPercent',
                            Number(event.target.value),
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => handleRemoveChore(chore.id)}
                >
                  Remove
                </button>
              </div>
            ))}
            {choreDrafts.length === 0 && (
              <p className="admin-empty">No chores configured. Add a new quest below.</p>
            )}
          </div>
          <div className="admin-actions">
            <button type="button" className="primary-button" onClick={handleSaveChoreLibrary}>
              Save chore library
            </button>
            <button type="button" className="ghost-button" onClick={handleResetChoreLibrary}>
              Reset to defaults
            </button>
          </div>
          <form className="admin-add-form" onSubmit={handleCreateChore}>
            <h3>Add a new quest</h3>
            <div className="admin-add-grid">
              <label>
                Title
                <input
                  type="text"
                  value={newChoreTitle}
                  onChange={(event) => setNewChoreTitle(event.target.value)}
                  placeholder="e.g. Window Wipe-Down"
                />
              </label>
              <label>
                Description
                <textarea
                  value={newChoreDescription}
                  onChange={(event) => setNewChoreDescription(event.target.value)}
                  placeholder="Describe the quest objective"
                />
              </label>
              <label>
                Min %
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={newChoreMinPercent}
                  onChange={(event) => setNewChoreMinPercent(Number(event.target.value) || 0)}
                />
              </label>
              <label>
                Max %
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={newChoreMaxPercent}
                  onChange={(event) => setNewChoreMaxPercent(Number(event.target.value) || 0)}
                />
              </label>
            </div>
            <button type="submit" className="primary-button" disabled={!newChoreTitle.trim()}>
              Add chore
            </button>
          </form>
        </section>
      </div>
    );
  }

  if (!activeUserId || !activeStats) {
    return (
      <div className="app login-screen">
        <header className="hero">
          <div className="hero__top">
            <h1>ChoreQuest Tracker</h1>
            <button type="button" className="ghost-button" onClick={handleToggleAdmin}>
              Admin tools
            </button>
          </div>
          <p>Select your adventurer to check in on today&apos;s quests.</p>
        </header>
        <section className="login-panel">
          <h2>Choose your player</h2>
          <p className="section-note">
            Everyone sees the same quest deck. Pick your profile to log completions and cash out.
          </p>
          <div className="login-grid">
            {USERS.map((user) => (
              <button
                key={user.id}
                type="button"
                className="login-button"
                onClick={() => handleSelectUser(user.id)}
              >
                {user.name}
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const cycle = state.cycle;
  const currentPlan = cycle.dailyPlans[cycle.dayIndex];
  const availableChores = currentPlan?.chores.filter((chore) => !chore.completed) ?? [];
  const completedChores = currentPlan?.chores.filter((chore) => chore.completed) ?? [];
  const availableBalance = Math.max(
    0,
    activeStats.totalEarned - activeStats.totalCashedOut,
  );

  return (
    <div className="app">
      <header className="hero">
        <div className="hero__top">
          <h1>ChoreQuest Tracker</h1>
          <div className="hero__actions">
            <button type="button" className="ghost-button" onClick={handleToggleAdmin}>
              Admin tools
            </button>
            <div className="user-switcher">
              <label htmlFor="user-select">Logged in as</label>
              <select
                id="user-select"
                value={activeUserId ?? ''}
                onChange={(event) => handleSelectUser(event.target.value as UserId)}
              >
                <option value="" disabled>
                  Select player
                </option>
                {USERS.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <p>
          Complete today&apos;s quests to reveal your cash rewards. Every chore stays visible for all
          players until the board refreshes tomorrow.
        </p>
      </header>

      <section className="wallet">
        <div className="wallet-card">
          <h2>Total earned</h2>
          <p className="wallet-amount">{formatCash(activeStats.totalEarned)}</p>
        </div>
        <div className="wallet-card">
          <h2>Available to cash out</h2>
          <p className="wallet-amount">{formatCash(availableBalance)}</p>
          <button
            type="button"
            className="primary-button"
            onClick={() => handleCashOut(availableBalance)}
            disabled={availableBalance <= 0}
          >
            Cash out all
          </button>
          <button type="button" className="ghost-button" onClick={handleResetWallet}>
            Reset wallet
          </button>
        </div>
      </section>

      <section className="chores">
        <div className="section-heading">
          <h2>Today&apos;s quest board</h2>
          {currentPlan && (
            <span className="section-note">
              Generated for {currentPlan.date}. All chores remain on the board for everyone until
              they reset tomorrow.
            </span>
          )}
        </div>
        {!currentPlan && (
          <div className="chore-grid">
            <p className="empty-state">No quests scheduled for today. Check back tomorrow!</p>
          </div>
        )}
        {currentPlan && (
          <div className="chore-groups">
            <div className="chore-group">
              <div className="section-heading">
                <h3>Available quests</h3>
                <span className="section-note">
                  {availableChores.length > 0
                    ? `${availableChores.length} quest${availableChores.length === 1 ? '' : 's'} ready to claim.`
                    : 'All quests have been claimed today.'}
                </span>
              </div>
              <div className="chore-grid">
                {availableChores.length === 0 && (
                  <p className="empty-state">No available quests remain for today.</p>
                )}
                {availableChores.map((chore) => (
                  <article key={chore.id} className="chore-card">
                    <div className="chore-card__content">
                      <span className="quest-label">Quest</span>
                      <h3>{chore.template.title}</h3>
                      <p className="chore-description">{chore.template.description}</p>
                      <p className="reward-placeholder">Reward hidden until completed</p>
                      <button
                        type="button"
                        onClick={() => handleComplete(chore.id)}
                        className="primary-button"
                      >
                        Mark complete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="chore-group">
              <div className="section-heading">
                <h3>Claimed quests</h3>
                <span className="section-note">
                  {completedChores.length > 0
                    ? `${completedChores.length} quest${completedChores.length === 1 ? '' : 's'} already collected.`
                    : 'No quests have been claimed yet.'}
                </span>
              </div>
              <div className="chore-grid">
                {completedChores.length === 0 && (
                  <p className="empty-state">Complete quests to see rewards revealed here.</p>
                )}
                {completedChores.map((chore) => {
                  const completedByLabel = chore.completedBy
                    ? USER_NAMES[chore.completedBy] ?? 'Unknown hero'
                    : null;
                  return (
                    <article key={chore.id} className="chore-card chore-card--completed">
                      <div className="chore-card__content">
                        <span className="quest-label">Quest</span>
                        <h3>{chore.template.title}</h3>
                        <p className="chore-description">{chore.template.description}</p>
                        <p className="reward-placeholder">
                          Reward earned: <strong>{formatCash(chore.reward)}</strong>
                        </p>
                        <button type="button" className="primary-button" disabled>
                          Quest claimed
                        </button>
                        {completedByLabel && (
                          <p className="chore-status">Claimed by {completedByLabel}</p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="popup-layer">
        {popups.map((popup) => (
          <div key={popup.id} className="reward-popup">
            +{formatCash(popup.amount)} — {popup.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
