import { useEffect, useState } from 'react';
import { AppState } from './models';
import { todayISO } from './dates';

const STORAGE_KEY = 'questchores:v1';

const defaultState: AppState = {
  users: [],
  chores: [],
  completions: [],
  payouts: [],
  currentCycle: null,
  dailyChores: [],
  dailyRollovers: [],
  config: {
    cycleDays: 28,
    cashPoolTotal: 400,
    startDateISO: todayISO(),
    seed: 'home',
  },
};

function readStorage(): AppState {
  if (typeof localStorage === 'undefined') return defaultState;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      config: { ...defaultState.config, ...parsed.config },
    } as AppState;
  } catch (err) {
    console.warn('Failed to parse saved state', err);
    return defaultState;
  }
}

function writeStorage(state: AppState) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function usePersistentAppState(): [AppState, (next: AppState | ((s: AppState) => AppState)) => void] {
  const [state, setState] = useState<AppState>(() => readStorage());

  useEffect(() => {
    writeStorage(state);
  }, [state]);

  const update = (next: AppState | ((s: AppState) => AppState)) => {
    setState((prev) => {
      const value = typeof next === 'function' ? (next as (s: AppState) => AppState)(prev) : next;
      writeStorage(value);
      return value;
    });
  };

  return [state, update];
}

export function resetState(): AppState {
  writeStorage(defaultState);
  return defaultState;
}

export { defaultState, STORAGE_KEY };
