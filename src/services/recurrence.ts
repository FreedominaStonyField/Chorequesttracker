import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay
} from 'date-fns';

import type { CardTemplate, Settings } from '../models/types.js';

export function computeNextInstanceDate(
  template: CardTemplate,
  now: Date,
  settings: Settings
): Date | null {
  const today = startOfDay(now);
  switch (template.recurrence) {
    case 'once':
      return today;
    case 'daily':
      return today;
    case 'weekly': {
      const anchor = template.weekAnchor ?? settings.weekAnchor;
      const currentDay = now.getDay();
      const diff = (anchor - currentDay + 7) % 7;
      return startOfDay(addDays(now, diff));
    }
    case 'monthly': {
      const anchor = template.monthAnchor ?? settings.monthAnchor;
      const candidate = new Date(now.getFullYear(), now.getMonth(), anchor);
      if (candidate.getMonth() !== now.getMonth()) {
        return startOfDay(endOfMonth(now));
      }
      return startOfDay(candidate);
    }
    default:
      return null;
  }
}

export function computeExpiry(
  template: CardTemplate,
  scheduled: Date,
  settings: Settings
): Date {
  switch (template.recurrence) {
    case 'once':
    case 'daily':
      return endOfDay(scheduled);
    case 'weekly':
      return endOfWeek(scheduled, {
        weekStartsOn: settings.weekAnchor as 0 | 1 | 2 | 3 | 4 | 5 | 6
      });
    case 'monthly':
      return endOfMonth(scheduled);
    default:
      return endOfDay(scheduled);
  }
}
