import type { RootState } from '../types';

const STORAGE_KEY = 'chorequest-state-v3';

export function loadState(): RootState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RootState;
  } catch (error) {
    console.error('Failed to load state', error);
    return null;
  }
}

export function saveState(state: RootState): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state', error);
  }
}

export function clearState(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
