import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { CHORE_LIBRARY } from './data/choreLibrary';
import type { AppState, CycleState, QuestChore } from './types';
import { randomIntPartition, pickRandom } from './utils/random';
import { clearState, loadState, saveState } from './utils/storage';
import { addDays, daysBetween, todayISO } from './utils/dates';

const CYCLE_LENGTH_DAYS = 7;
const DAILY_CHORES_COUNT = 5;
const BASE_REWARD_POOL = 500;
const MIN_CHORE_REWARD = 10;

const generateId = () => Math.random().toString(36).slice(2, 10);

type RewardPopup = {
  id: string;
  amount: number;
  label: string;
};

function generateChoresForBudget(budget: number): QuestChore[] {
  const count = Math.min(DAILY_CHORES_COUNT, CHORE_LIBRARY.length);
  const templates = pickRandom(CHORE_LIBRARY, count);
  const minPerChore =
    budget >= count * MIN_CHORE_REWARD ? MIN_CHORE_REWARD : 0;
  const rewards = randomIntPartition(budget, templates.length, minPerChore);

  return templates.map((template, index) => ({
    id: `${template.id}-${generateId()}`,
    template,
    reward: rewards[index] ?? 0,
    revealed: false,
    completed: false,
  }));
}

function createCycle(startDate: string, carryOver: number): CycleState {
  const rewardPool = BASE_REWARD_POOL + carryOver;
  const minDailyTotal = MIN_CHORE_REWARD * DAILY_CHORES_COUNT;
  const canGuaranteeMinimum =
    rewardPool >= CYCLE_LENGTH_DAYS * minDailyTotal;
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
    chores: generateChoresForBudget(dailyBudgets[0] ?? 0),
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

function synchronizeState(base: AppState | null, today: string): AppState {
  if (!base) {
    return {
      user: { totalEarned: 0, totalCashedOut: 0 },
      cycle: createCycle(today, 0),
      lastAccessDate: today,
    };
  }

  const user = { ...base.user };
  const cycle: CycleState = {
    ...base.cycle,
    chores: base.cycle.chores.map((chore) => ({ ...chore })),
  };

  const daysSinceCycleStart = daysBetween(cycle.startDate, today);

  if (daysSinceCycleStart < 0) {
    // Time travel backwards – start a new cycle from today to avoid inconsistencies.
    return {
      user,
      cycle: createCycle(today, 0),
      lastAccessDate: today,
    };
  }

  if (daysSinceCycleStart >= cycle.cycleLength) {
    const cyclesPassed = Math.floor(daysSinceCycleStart / cycle.cycleLength) || 1;
    const carryOver = computeCarryOver(cycle) +
      Math.max(0, cyclesPassed - 1) * BASE_REWARD_POOL;

    return {
      user,
      cycle: createCycle(today, carryOver),
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
    );
  } else if (cycle.chores.length === 0) {
    cycle.chores = generateChoresForBudget(
      cycle.dailyBudgets[targetDayIndex] ?? 0,
    );
  }

  return {
    user,
    cycle,
    lastAccessDate: today,
  };
}

function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [popups, setPopups] = useState<RewardPopup[]>([]);

  useEffect(() => {
    const today = todayISO();
    const stored = loadState();
    setState(synchronizeState(stored, today));
  }, []);

  useEffect(() => {
    if (!state) return;
    saveState(state);
  }, [state]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setState((current) => synchronizeState(current, todayISO()));
    }, 1000 * 60 * 5);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setState((current) => synchronizeState(current, todayISO()));
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const availableBalance = useMemo(() => {
    if (!state) return 0;
    return state.user.totalEarned - state.user.totalCashedOut;
  }, [state]);

  const handleReveal = (choreId: string) => {
    setState((current) => {
      if (!current) return current;
      const cycle = {
        ...current.cycle,
        chores: current.cycle.chores.map((chore) =>
          chore.id === choreId ? { ...chore, revealed: true } : chore,
        ),
      };
      return { ...current, cycle };
    });
  };

  const handleComplete = (choreId: string) => {
    let newPopup: RewardPopup | null = null;
    setState((current) => {
      if (!current) return current;
      const target = current.cycle.chores.find((chore) => chore.id === choreId);
      if (!target || target.completed) return current;

      const updatedChores = current.cycle.chores.map((chore) =>
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

      return {
        ...current,
        user: {
          ...current.user,
          totalEarned: current.user.totalEarned + target.reward,
        },
        cycle: { ...current.cycle, chores: updatedChores },
      };
    });

    if (newPopup) {
      setPopups((current) => [...current, newPopup!]);
      window.setTimeout(() => {
        setPopups((current) => current.filter((popup) => popup.id !== newPopup?.id));
      }, 2200);
    }
  };

  const handleCashOut = (amount: number) => {
    if (!state) return;
    setState((current) => {
      if (!current) return current;
      const available = current.user.totalEarned - current.user.totalCashedOut;
      const value = Math.min(amount, available);
      if (value <= 0) return current;
      return {
        ...current,
        user: {
          ...current.user,
          totalCashedOut: current.user.totalCashedOut + value,
        },
      };
    });
  };

  const handleReset = () => {
    clearState();
    const today = todayISO();
    setState(synchronizeState(null, today));
  };

  if (!state) {
    return (
      <div className="app-loading">
        <p>Summoning quests...</p>
      </div>
    );
  }

  const { cycle } = state;
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
        <h1>ChoreQuest Tracker</h1>
        <p>
          Draw daily chore quests, flip the cards to reveal their hidden rewards,
          and cash out your hard-earned points.
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
          <p className="stat-primary">{cycle.rewardPool} pts</p>
          <p className="stat-subtle">Carry-in: {cycle.carryOverFromPreviousCycle} pts</p>
          <p className="stat-subtle">Banked rollover: {carryForward} pts</p>
          <p className="stat-subtle">Projected next cycle: {carryForward + currentUnclaimed} pts</p>
        </div>

        <div className="stat-card">
          <h2>Today's Budget</h2>
          <p className="stat-primary">{dayBudget} pts</p>
          <p className="stat-subtle">Claimed: {dayClaimed} pts</p>
          <p className="stat-subtle">Hidden: {dayUnclaimed} pts</p>
        </div>

        <div className="stat-card">
          <h2>Your Wallet</h2>
          <p className="stat-primary">Earned: {state.user.totalEarned} pts</p>
          <p className="stat-subtle">Cashed out: {state.user.totalCashedOut} pts</p>
          <p className="stat-subtle">Available: {availableBalance} pts</p>
          <button
            type="button"
            className="ghost-button"
            onClick={() => handleCashOut(availableBalance)}
            disabled={availableBalance <= 0}
          >
            Cash out all
          </button>
        </div>
      </section>

      <section className="chores">
        <div className="section-heading">
          <h2>Daily Quest Deck</h2>
          <span className="section-note">Flip a card to reveal its reward, then mark it complete to claim the loot!</span>
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
                    <p className="reward-amount">{chore.reward} pts</p>
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
          Reset progress
        </button>
        <span>Next cycle starts {addDays(cycle.startDate, cycle.cycleLength)}.</span>
      </footer>

      <div className="popup-layer">
        {popups.map((popup) => (
          <div key={popup.id} className="reward-popup">
            +{popup.amount} pts — {popup.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
