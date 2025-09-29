import type { RootState } from '../types';

const DEFAULT_API_BASE = 'http://localhost:4000/api';

const API_BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? (import.meta.env.VITE_API_BASE_URL as string)
    : DEFAULT_API_BASE;

const API_TOKEN =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_TOKEN
    ? (import.meta.env.VITE_API_TOKEN as string)
    : undefined;

const authHeaders = API_TOKEN ? { 'x-api-key': API_TOKEN } : undefined;

export async function loadState(): Promise<RootState | null> {
  if (typeof window === 'undefined') return null;

  try {
    const response = await fetch(`${API_BASE_URL}/state`, {
      headers: authHeaders,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed with status ${response.status}`);
    }

    return (await response.json()) as RootState;
  } catch (error) {
    console.error('Failed to load state from API', error);
    return null;
  }
}

export function saveState(state: RootState): void {
  if (typeof window === 'undefined') return;

  void fetch(`${API_BASE_URL}/state`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeaders ?? {}),
    },
    body: JSON.stringify({ state }),
  }).catch((error) => {
    console.error('Failed to persist state to API', error);
  });
}

export function clearState(): void {
  if (typeof window === 'undefined') return;

  void fetch(`${API_BASE_URL}/state`, {
    method: 'DELETE',
    headers: authHeaders,
  }).catch((error) => {
    console.error('Failed to clear state via API', error);
  });
}
