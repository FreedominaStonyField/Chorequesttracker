import { CycleConfig } from './models';

export function toDateOnlyISO(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function dayIndex(dateISO: string, config: CycleConfig): number {
  const start = new Date(config.startDateISO);
  const target = new Date(dateISO);
  const diff = Math.floor((target.getTime() - start.getTime()) / 86400000);
  return diff;
}

export function withinCycle(dateISO: string, config: CycleConfig): boolean {
  const idx = dayIndex(dateISO, config);
  return idx >= 0 && idx < config.cycleDays;
}

export function cycleDayLabel(dateISO: string, config: CycleConfig): string {
  const idx = dayIndex(dateISO, config);
  if (Number.isNaN(idx)) return '—';
  return `Day ${idx + 1} / ${config.cycleDays}`;
}

export function todayISO(): string {
  return toDateOnlyISO(new Date());
}
