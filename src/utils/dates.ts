const pad = (value: number): string => value.toString().padStart(2, '0');

const formatLocalDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseLocalISODate = (iso: string): Date => {
  const [year, month, day] = iso.split('-').map((part) => Number.parseInt(part, 10));
  return new Date(year, (month || 1) - 1, day || 1);
};

export function todayISO(): string {
  return formatLocalDate(new Date());
}

export function daysBetween(startISO: string, endISO: string): number {
  const start = parseLocalISODate(startISO);
  const end = parseLocalISODate(endISO);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay);
}

export function addDays(iso: string, days: number): string {
  const date = parseLocalISODate(iso);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}
