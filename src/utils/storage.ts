import type { RootState } from '../types';

const DEFAULT_API_BASE = '/api';

const getApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_API_BASE;
  }

  const configured = (window as typeof window & { __API_BASE__?: string }).__API_BASE__;
  if (configured) return configured;

  const envBase = import.meta.env?.VITE_API_BASE_URL;
  return typeof envBase === 'string' && envBase.length > 0 ? envBase : DEFAULT_API_BASE;
};

const resolveApiUrl = (path: string) => {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
};

export async function loadState(): Promise<RootState | null> {
  if (typeof fetch === 'undefined') return null;

  try {
    const response = await fetch(resolveApiUrl('/state'), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Unexpected response ${response.status}`);
    }

    const data = (await response.json()) as RootState;
    return data;
  } catch (error) {
    console.error('Failed to load state', error);
    return null;
  }
}

export async function saveState(state: RootState): Promise<void> {
  if (typeof fetch === 'undefined') return;

  try {
    const response = await fetch(resolveApiUrl('/state'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(state),
    });

    if (!response.ok) {
      throw new Error(`Unexpected response ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to save state', error);
  }
}

export async function clearState(): Promise<void> {
  if (typeof fetch === 'undefined') return;

  try {
    const response = await fetch(resolveApiUrl('/state'), {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Unexpected response ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to clear state', error);
  }
}
