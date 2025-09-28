export function randomIntPartition(total: number, parts: number, minValue = 1): number[] {
  if (parts <= 0) return [];
  if (total <= 0) return new Array(parts).fill(0);

  const guaranteed = minValue * parts;
  if (guaranteed > total) {
    // Not enough to give each part the minimum; fall back to even split rounding down.
    const base = Math.floor(total / parts);
    const remainder = total % parts;
    return new Array(parts).fill(0).map((_, index) => base + (index < remainder ? 1 : 0));
  }

  const remaining = total - guaranteed;
  const weights = Array.from({ length: parts }, () => Math.random());
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0) || 1;

  let allocated = 0;
  const partition = weights.map((weight) => {
    const value = Math.floor((weight / weightTotal) * remaining);
    allocated += value;
    return value + minValue;
  });

  let remainder = total - (allocated + guaranteed);
  while (remainder > 0) {
    const index = Math.floor(Math.random() * parts);
    partition[index] += 1;
    remainder -= 1;
  }

  return partition;
}

export function randomChoice<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function pickRandom<T>(items: readonly T[], count: number): T[] {
  if (count >= items.length) {
    return [...items];
  }

  const pool = [...items];
  const chosen: T[] = [];
  for (let i = 0; i < count; i += 1) {
    const index = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(index, 1)[0]);
  }

  return chosen;
}
