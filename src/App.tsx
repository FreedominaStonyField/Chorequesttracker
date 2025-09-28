import { useEffect, useMemo, useState, type FormEvent } from 'react';
import './App.css';
import { DEFAULT_CHORE_LIBRARY } from './data/choreLibrary';
import type { ChoreTemplate } from './data/choreLibrary';
import type {
  ProfileState,
  CycleState,
  QuestChore,
  RootState,
  UserId,
  AdminSettings,
} from './types';
import { randomIntPartition, pickRandom } from './utils/random';
import { loadState, saveState } from './utils/storage';
import { addDays, daysBetween, todayISO } from './utils/dates';

const CYCLE_LENGTH_DAYS = 7;

const DEFAULT_SETTINGS: AdminSettings = {
  baseRewardPool: 500,
  dailyChoresCount: 5,
  minChoreReward: 10,
  maxChoreReward: 120,
};

const USERS: { id: UserId; name: string }[] = [
  { id: 'fransisco', name: 'Fransisco' },
  { id: 'lewis', name: 'Lewis' },
  { id: 'jero', name: 'Jero' },
  { id: 'saffire', name: 'Saffire' },
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const formatCash = (amount: number) => currencyFormatter.format(amount);

const generateId = () => Math.random().toString(36).slice(2, 10);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'chore';

const sanitizeSettings = (settings?: AdminSettings | null): AdminSettings => {
  const base = settings ?? DEFAULT_SETTINGS;
  const dailyChoresCount = Math.max(0, Math.floor(base.dailyChoresCount));
  const minChoreReward = Math.max(0, Math.floor(base.minChoreReward));
  const maxChoreReward = Math.max(minChoreReward, Math.floor(base.maxChoreReward));
  const baseRewardPool = Math.max(0, Math.floor(base.baseRewardPool));

  return {
    baseRewardPool,
    dailyChoresCount,
    minChoreReward,
    maxChoreReward,
  };
};

const cloneSettings = (settings: AdminSettings): AdminSettings => ({ ...settings });

const sanitizeChoreLibrary = (
  library?: readonly Partial<ChoreTemplate>[] | null,
): ChoreTemplate[] => {
  const source = library && library.length > 0 ? library : DEFAULT_CHORE_LIBRARY;
  return source.map((entry, index) => ({
    id: (entry?.id ?? '').toString().trim().length > 0
      ? (entry?.id ?? '').toString().trim()
      : `chore-${index}`,
    title: (entry?.title ?? '').toString().trim().length > 0
      ? (entry?.title ?? '').toString().trim()
      : `Chore ${index + 1}`,
    description: (entry?.description ?? '').toString().trim(),
  }));
};

const cloneChoreLibrary = (library: readonly ChoreTemplate[]): ChoreTemplate[] =>
  library.map((entry) => ({ ...entry }));

type RewardPopup = {
  id: string;
  amount: number;
  label: string;
};

function generateChoresForBudget(
  budget: number,
  library: readonly ChoreTemplate[],
  settings: AdminSettings,
): QuestChore[] {
  const count = Math.min(settings.dailyChoresCount, library.length);
  if (count <= 0) return [];

  const templates = pickRandom(library, count);
  const minPerChore =
    budget >= count * settings.minChoreReward ? settings.minChoreReward : 0;
  const rewards = randomIntPartition(
    budget,
    templates.length,
    minPerChore,
    settings.maxChoreReward,
  );

  return templates.map((template, index) => ({
    id: `${template.id}-${generateId()}`,
    template,
    reward: rewards[index] ?? 0,
    revealed: false,
    completed: false,
  }));
}

function createCycle(
  startDate: string,
  carryOver: number,
  library: readonly ChoreTemplate[],
  settings: AdminSettings,
): CycleState {
  const effectiveChores = Math.min(settings.dailyChoresCount, library.length);
  const rewardPool = settings.baseRewardPool + carryOver;
  const minDailyTotal = settings.minChoreReward * effectiveChores;
  const canGuaranteeMinimum =
    effectiveChores > 0 && rewardPool >= CYCLE_LENGTH_DAYS * minDailyTotal;
  const dailyBudgets = randomIntPartition(
    rewardPool,
    CYCLE_LENGTH_DAYS,
    canGuaranteeMinimum ? minDailyTotal : 0,
  );

  return {
    cycleId: `${startDate}-${generateId()}`,
    startDate,
    dayIndex: 0,
    cycleLength: CYCLE_LENGTH_DAYS,
    rewardPool,
    carryOverFromPreviousCycle: carryOver,
    unclaimedThisCycle: 0,
    dailyBudgets,
    chores: generateChoresForBudget(dailyBudgets[0] ?? 0, library, settings),
    config: cloneSettings(settings),
  };
}

function computeCarryOver(cycle: CycleState): number {
  const currentUnclaimed = cycle.chores
    .filter((chore) => !chore.completed)
    .reduce((sum, chore) => sum + chore.reward, 0);

  const futureBudgets = cycle.dailyBudgets
    .slice(cycle.dayIndex + 1)
    .reduce((sum, value) => sum + value, 0);

  return (
    cycle.carryOverFromPreviousCycle +
    cycle.unclaimedThisCycle +
    currentUnclaimed +
    futureBudgets
  );
}

function settingsChanged(a: AdminSettings, b: AdminSettings): boolean {
  return (
    a.baseRewardPool !== b.baseRewardPool ||
    a.dailyChoresCount !== b.dailyChoresCount ||
    a.minChoreReward !== b.minChoreReward ||
    a.maxChoreReward !== b.maxChoreReward
  );
}

function synchronizeProfileState(
  base: ProfileState | null,
  today: string,
  library: readonly ChoreTemplate[],
  settings: AdminSettings,
): ProfileState {
  if (!base) {
    return {
      user: { totalEarned: 0, totalCashedOut: 0 },
      cycle: createCycle(today, 0, library, settings),
      lastAccessDate: today,
    };
  }

  const user = { ...base.user };
  const cycle: CycleState = {
    ...base.cycle,
    chores: base.cycle.chores.map((chore) => ({ ...chore })),
    config: base.cycle.config
      ? cloneSettings(base.cycle.config)
      : cloneSettings(settings),
  };

  if (settingsChanged(cycle.config, settings)) {
    const carryOver = computeCarryOver(cycle);
    return {
      user,
      cycle: createCycle(today, carryOver, library, settings),
      lastAccessDate: today,
    };
  }

  cycle.config = cloneSettings(settings);

  const daysSinceCycleStart = daysBetween(cycle.startDate, today);

  if (daysSinceCycleStart < 0) {
    // Time travel backwards – start a new cycle from today to avoid inconsistencies.
    return {
      user,
      cycle: createCycle(today, 0, library, settings),
      lastAccessDate: today,
    };
  }

  if (daysSinceCycleStart >= cycle.cycleLength) {
    const cyclesPassed = Math.floor(daysSinceCycleStart / cycle.cycleLength) || 1;
    const carryOver =
      computeCarryOver(cycle) + Math.max(0, cyclesPassed - 1) * settings.baseRewardPool;

    return {
      user,
      cycle: createCycle(today, carryOver, library, settings),
      lastAccessDate: today,
    };
  }

  const targetDayIndex = Math.min(
    daysSinceCycleStart,
    cycle.cycleLength - 1,
  );

  if (targetDayIndex > cycle.dayIndex) {
    const currentUnclaimed = cycle.chores
      .filter((chore) => !chore.completed)
      .reduce((sum, chore) => sum + chore.reward, 0);

    let updatedUnclaimed = cycle.unclaimedThisCycle + currentUnclaimed;
    for (let day = cycle.dayIndex + 1; day < targetDayIndex; day += 1) {
      updatedUnclaimed += cycle.dailyBudgets[day] ?? 0;
    }

    cycle.dayIndex = targetDayIndex;
    cycle.unclaimedThisCycle = updatedUnclaimed;
    cycle.chores = generateChoresForBudget(
      cycle.dailyBudgets[targetDayIndex] ?? 0,
      library,
      settings,
    );
  } else if (cycle.chores.length === 0) {
    cycle.chores = generateChoresForBudget(
      cycle.dailyBudgets[targetDayIndex] ?? 0,
      library,
      settings,
    );
  }

  return {
    user,
    cycle,
    lastAccessDate: today,
  };
}

function synchronizeRootState(base: RootState | null, today: string): RootState {
  const adminSettings = sanitizeSettings(base?.adminSettings ?? null);
  const choreLibrary = cloneChoreLibrary(
    sanitizeChoreLibrary(base?.choreLibrary ?? null),
  );

  const profiles = USERS.reduce<Record<UserId, ProfileState>>((acc, user) => {
    const existing = base?.profiles?.[user.id] ?? null;
    acc[user.id] = synchronizeProfileState(
      existing,
      today,
      choreLibrary,
      adminSettings,
    );
    return acc;
  }, {} as Record<UserId, ProfileState>);

  const activeUser = base?.activeUser && profiles[base.activeUser]
    ? base.activeUser
    : null;

  return {
    activeUser,
    profiles,
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
  const activeProfile = activeUserId ? state?.profiles[activeUserId] : null;

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

  const handleSettingsFieldChange = (
    field: keyof AdminSettings,
    value: number,
  ) => {
    const safeValue = Number.isNaN(value) ? 0 : value;
    let normalized = Math.max(0, safeValue);
    if (field === 'dailyChoresCount') {
      normalized = Math.max(0, Math.floor(safeValue));
    } else if (field === 'minChoreReward' || field === 'maxChoreReward') {
      normalized = Math.max(0, Math.floor(safeValue));
    }
    setSettingsDraft((currentDraft) => {
      const next: AdminSettings = { ...currentDraft, [field]: normalized };
      if (field === 'minChoreReward' && normalized > currentDraft.maxChoreReward) {
        next.maxChoreReward = normalized;
      }
      if (field === 'maxChoreReward' && normalized < currentDraft.minChoreReward) {
        next.minChoreReward = normalized;
      }
      if (field === 'dailyChoresCount' && !Number.isFinite(normalized)) {
        next.dailyChoresCount = 0;
      }
      return next;
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

  const handleRemoveChore = (id: string) => {
    setChoreDrafts((currentDrafts) => currentDrafts.filter((chore) => chore.id !== id));
  };

  const handleResetChoreLibrary = () => {
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

    const baseId = slugify(title);
    let candidate = baseId;
    let suffix = 1;
    const existingIds = new Set(choreDrafts.map((chore) => chore.id));
    while (existingIds.has(candidate)) {
      candidate = `${baseId}-${suffix}`;
      suffix += 1;
    }

    const newTemplate: ChoreTemplate = {
      id: candidate,
      title,
      description,
    };

    setChoreDrafts((currentDrafts) => [...currentDrafts, newTemplate]);
    setNewChoreTitle('');
    setNewChoreDescription('');
  };

  const handleToggleAdmin = () => {
    setShowAdmin((currentValue) => !currentValue);
  };

  useEffect(() => {
    setPopups([]);
  }, [activeUserId]);

  const availableBalance = useMemo(() => {
    if (!activeProfile) return 0;
    return activeProfile.user.totalEarned - activeProfile.user.totalCashedOut;
  }, [activeProfile]);

  const handleSelectUser = (userId: UserId) => {
    setState((current) => {
      const synced = synchronizeRootState(current, todayISO());
      return { ...synced, activeUser: userId };
    });
  };

  const handleReveal = (choreId: string) => {
    setState((current) => {
      if (!current?.activeUser) return current;
      const profile = current.profiles[current.activeUser];
      const cycle = {
        ...profile.cycle,
        chores: profile.cycle.chores.map((chore) =>
          chore.id === choreId ? { ...chore, revealed: true } : chore,
        ),
      };

      return {
        ...current,
        profiles: {
          ...current.profiles,
          [current.activeUser]: { ...profile, cycle },
        },
      };
    });
  };

  const handleComplete = (choreId: string) => {
    let newPopup: RewardPopup | null = null;
    setState((current) => {
      if (!current?.activeUser) return current;
      const profile = current.profiles[current.activeUser];
      const target = profile.cycle.chores.find((chore) => chore.id === choreId);
      if (!target || target.completed) return current;

      const updatedChores = profile.cycle.chores.map((chore) =>
        chore.id === choreId
          ? {
              ...chore,
              revealed: true,
              completed: true,
              completionTimestamp: new Date().toISOString(),
            }
          : chore,
      );

      newPopup = {
        id: generateId(),
        amount: target.reward,
        label: target.template.title,
      };

      const updatedProfile: ProfileState = {
        ...profile,
        user: {
          ...profile.user,
          totalEarned: profile.user.totalEarned + target.reward,
        },
        cycle: { ...profile.cycle, chores: updatedChores },
      };

      return {
        ...current,
        profiles: {
          ...current.profiles,
          [current.activeUser]: updatedProfile,
        },
      };
    });

    if (newPopup) {
      const popup: RewardPopup = newPopup;
      setPopups((current) => [...current, popup]);
      window.setTimeout(() => {
        setPopups((current) =>
          current.filter((entry: RewardPopup) => entry.id !== popup.id),
        );
      }, 2200);
    }
  };

  const handleCashOut = (amount: number) => {
    setState((current) => {
      if (!current?.activeUser) return current;
      const profile = current.profiles[current.activeUser];
      const available =
        profile.user.totalEarned - profile.user.totalCashedOut;
      const value = Math.min(amount, available);
      if (value <= 0) return current;
      const updatedProfile: ProfileState = {
        ...profile,
        user: {
          ...profile.user,
          totalCashedOut: profile.user.totalCashedOut + value,
        },
      };

      return {
        ...current,
        profiles: {
          ...current.profiles,
          [current.activeUser]: updatedProfile,
        },
      };
    });
  };

  const handleReset = () => {
    setState((current) => {
      if (!current?.activeUser) return current;
      const today = todayISO();
      const resetProfile = synchronizeProfileState(
        null,
        today,
        current.choreLibrary,
        current.adminSettings,
      );
      return {
        ...current,
        profiles: {
          ...current.profiles,
          [current.activeUser]: resetProfile,
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
    const effectiveChoreCount = Math.min(
      Math.max(0, Math.floor(settingsDraft.dailyChoresCount)),
      choreDrafts.length,
    );
    const averagePerDay =
      CYCLE_LENGTH_DAYS > 0
        ? settingsDraft.baseRewardPool / CYCLE_LENGTH_DAYS
        : 0;
    const averagePerChore =
      effectiveChoreCount > 0 ? averagePerDay / effectiveChoreCount : 0;
    const minTotal =
      effectiveChoreCount > 0
        ? settingsDraft.minChoreReward * effectiveChoreCount * CYCLE_LENGTH_DAYS
        : 0;
    const maxTotal =
      effectiveChoreCount > 0
        ? settingsDraft.maxChoreReward * effectiveChoreCount * CYCLE_LENGTH_DAYS
        : 0;
    const poolWithinRange =
      effectiveChoreCount === 0 ||
      (settingsDraft.baseRewardPool >= minTotal &&
        (maxTotal === 0 || settingsDraft.baseRewardPool <= maxTotal));

    return (
      <div className="app admin-app">
        <header className="hero admin-hero">
          <div className="hero__top">
            <h1>Admin Control Center</h1>
            <button type="button" className="ghost-button" onClick={handleToggleAdmin}>
              Back to quests
            </button>
          </div>
          <p>Adjust reward pools and chore cards for every adventurer.</p>
        </header>

        <section className="admin-grid">
          <article className="admin-card">
            <h2>Reward Configuration</h2>
            <label className="admin-field">
              Base reward pool (per cycle)
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
            <label className="admin-field">
              Daily chores dealt
              <input
                type="number"
                min={0}
                step={1}
                value={settingsDraft.dailyChoresCount}
                onChange={(event) =>
                  handleSettingsFieldChange(
                    'dailyChoresCount',
                    Number.isNaN(Number(event.target.value))
                      ? 0
                      : Number(event.target.value),
                  )
                }
              />
            </label>
            <div className="admin-field admin-field--split">
              <label>
                Minimum reward per chore
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={settingsDraft.minChoreReward}
                  onChange={(event) =>
                    handleSettingsFieldChange(
                      'minChoreReward',
                      Number.isNaN(Number(event.target.value))
                        ? 0
                        : Number(event.target.value),
                    )
                  }
                />
              </label>
              <label>
                Maximum reward per chore
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={settingsDraft.maxChoreReward}
                  onChange={(event) =>
                    handleSettingsFieldChange(
                      'maxChoreReward',
                      Number.isNaN(Number(event.target.value))
                        ? 0
                        : Number(event.target.value),
                    )
                  }
                />
              </label>
            </div>
            <button type="button" className="primary-button" onClick={handleSaveSettings}>
              Save reward settings
            </button>
          </article>

          <article className="admin-card admin-card--summary">
            <h2>Payout Forecast</h2>
            <p>
              Cycle length: <strong>{CYCLE_LENGTH_DAYS}</strong> days
            </p>
            <p>
              Active chores per day:{' '}
              <strong>{Math.min(settingsDraft.dailyChoresCount, choreDrafts.length)}</strong>
            </p>
            <p>
              Average payout per day: <strong>{formatCash(averagePerDay)}</strong>
            </p>
            <p>
              Average payout per chore: <strong>{formatCash(averagePerChore)}</strong>
            </p>
            <p>
              Reward range per chore:{' '}
              <strong>
                {formatCash(settingsDraft.minChoreReward)} – {formatCash(settingsDraft.maxChoreReward)}
              </strong>
            </p>
            {effectiveChoreCount === 0 ? (
              <p className="admin-warning">No chores configured. Add at least one card to generate quests.</p>
            ) : poolWithinRange ? (
              <p className="admin-note">Base reward pool fits within the configured min/max totals.</p>
            ) : (
              <p className="admin-warning">
                Base reward pool is outside the allowable total range of {formatCash(minTotal)} –{' '}
                {formatCash(maxTotal)}. Adjust the pool or the per-chore bounds.
              </p>
            )}
          </article>
        </section>

        <section className="admin-chores">
          <div className="section-heading">
            <h2>Chore Library</h2>
            <span className="section-note">
              Edit existing quests, reset to defaults, or craft new chores for the daily deck.
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
            </div>
            <button type="submit" className="primary-button" disabled={!newChoreTitle.trim()}>
              Add chore
            </button>
          </form>
        </section>
      </div>
    );
  }

  if (!activeProfile) {
    return (
      <div className="app login-screen">
        <header className="hero">
          <div className="hero__top">
            <h1>ChoreQuest Tracker</h1>
            <button type="button" className="ghost-button" onClick={handleToggleAdmin}>
              Admin tools
            </button>
          </div>
          <p>Select your adventurer to begin claiming chore cash.</p>
        </header>
        <section className="login-panel">
          <h2>Choose your player</h2>
          <p className="section-note">
            Each player has their own quest cycle and cash ledger. Pick one to log in.
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

  const { cycle } = activeProfile;
  const cycleDay = cycle.dayIndex + 1;
  const daysRemaining = Math.max(cycle.cycleLength - cycleDay, 0);
  const dayBudget = cycle.dailyBudgets[cycle.dayIndex] ?? 0;
  const dayClaimed = cycle.chores
    .filter((chore) => chore.completed)
    .reduce((sum, chore) => sum + chore.reward, 0);
  const dayUnclaimed = Math.max(dayBudget - dayClaimed, 0);
  const currentUnclaimed = cycle.chores
    .filter((chore) => !chore.completed)
    .reduce((sum, chore) => sum + chore.reward, 0);
  const carryForward =
    cycle.carryOverFromPreviousCycle + cycle.unclaimedThisCycle;

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
          Draw daily chore quests, flip the cards to reveal their hidden cash
          rewards, and withdraw your hard-earned earnings.
        </p>
      </header>

      <section className="dashboard">
        <div className="stat-card">
          <h2>Cycle Progress</h2>
          <p className="stat-primary">Day {cycleDay} of {cycle.cycleLength}</p>
          <div className="progress-bar">
            <div
              className="progress-bar__fill"
              style={{ width: `${(cycleDay / cycle.cycleLength) * 100}%` }}
            />
          </div>
          <p className="stat-subtle">{daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining in this cycle</p>
        </div>

        <div className="stat-card">
          <h2>Reward Pool</h2>
          <p className="stat-primary">{formatCash(cycle.rewardPool)}</p>
          <p className="stat-subtle">Carry-in: {formatCash(cycle.carryOverFromPreviousCycle)}</p>
          <p className="stat-subtle">Banked rollover: {formatCash(carryForward)}</p>
          <p className="stat-subtle">Projected next cycle: {formatCash(carryForward + currentUnclaimed)}</p>
        </div>

        <div className="stat-card">
          <h2>Today's Budget</h2>
          <p className="stat-primary">{formatCash(dayBudget)}</p>
          <p className="stat-subtle">Claimed: {formatCash(dayClaimed)}</p>
          <p className="stat-subtle">Hidden: {formatCash(dayUnclaimed)}</p>
        </div>

        <div className="stat-card">
          <h2>Your Wallet</h2>
          <p className="stat-primary">Earned: {formatCash(activeProfile.user.totalEarned)}</p>
          <p className="stat-subtle">Withdrawn: {formatCash(activeProfile.user.totalCashedOut)}</p>
          <p className="stat-subtle">Available: {formatCash(availableBalance)}</p>
          <button
            type="button"
            className="ghost-button"
            onClick={() => handleCashOut(availableBalance)}
            disabled={availableBalance <= 0}
          >
            Withdraw all cash
          </button>
        </div>
      </section>

      <section className="chores">
        <div className="section-heading">
          <h2>Daily Quest Deck</h2>
          <span className="section-note">Flip a card to reveal its reward, then mark it complete to claim the cash!</span>
        </div>
        <div className="chore-grid">
          {cycle.chores.map((chore) => {
            const cardClasses = [
              'chore-card',
              chore.revealed ? 'chore-card--revealed' : '',
              chore.completed ? 'chore-card--completed' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <article key={chore.id} className={cardClasses}>
                <div className="chore-card__inner">
                  <div className="chore-card__face chore-card__face--front">
                    <span className="quest-label">Quest</span>
                    <h3>{chore.template.title}</h3>
                    <p>Tap to draw your reward</p>
                    <button type="button" onClick={() => handleReveal(chore.id)}>
                      Draw
                    </button>
                  </div>
                  <div className="chore-card__face chore-card__face--back">
                    <span className="quest-label">Reward Revealed</span>
                    <h3>{chore.template.title}</h3>
                    <p className="reward-amount">{formatCash(chore.reward)}</p>
                    <p className="chore-description">{chore.template.description}</p>
                    <button
                      type="button"
                      onClick={() => handleComplete(chore.id)}
                      disabled={chore.completed}
                    >
                      {chore.completed ? 'Claimed' : 'Complete quest'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="footer">
        <button type="button" className="ghost-button" onClick={handleReset}>
          Reset this profile
        </button>
        <span>Next cycle starts {addDays(cycle.startDate, cycle.cycleLength)}.</span>
      </footer>

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
