export function randomIntPartition(
  total: number,
  parts: number,
  minValue = 1,
  maxValue = Number.POSITIVE_INFINITY,
): number[] {
  if (parts <= 0) return [];
  if (total <= 0) return new Array(parts).fill(0);

  const normalizedMin = Number.isFinite(minValue) ? Math.max(0, Math.floor(minValue)) : 0;
  const normalizedMax = Number.isFinite(maxValue)
    ? Math.max(normalizedMin, Math.floor(maxValue))
    : Number.POSITIVE_INFINITY;

  const minTotal = normalizedMin * parts;
  if (minTotal > total) {
    // Not enough to satisfy the minimum requirement. Fall back to an even split.
    const base = Math.floor(total / parts);
    const remainder = total % parts;
    return new Array(parts)
      .fill(0)
      .map((_, index) => base + (index < remainder ? 1 : 0));
  }

  const maxTotal =
    normalizedMax === Number.POSITIVE_INFINITY
      ? Number.POSITIVE_INFINITY
      : normalizedMax * parts;

  if (total > maxTotal) {
    // Impossible to respect the max constraint; defer to an unconstrained distribution.
    return randomIntPartition(total, parts, normalizedMin);
  }

  if (normalizedMax === Number.POSITIVE_INFINITY) {
    const guaranteed = normalizedMin * parts;
    const remaining = total - guaranteed;
    const weights = Array.from({ length: parts }, () => Math.random());
    const weightTotal = weights.reduce((sum, weight) => sum + weight, 0) || 1;

    let allocated = 0;
    const partition = weights.map((weight) => {
      const value = Math.floor((weight / weightTotal) * remaining);
      allocated += value;
      return value + normalizedMin;
    });

    let remainder = total - (allocated + guaranteed);
    while (remainder > 0) {
      const index = Math.floor(Math.random() * parts);
      partition[index] += 1;
      remainder -= 1;
    }

    return partition;
  }

  const extras = new Array(parts).fill(0);
  let remaining = total - minTotal;
  const maxExtra = normalizedMax - normalizedMin;

  while (remaining > 0) {
    const candidates = extras
      .map((value, index) => ({ value, index }))
      .filter(({ value }) => value < maxExtra);
    if (candidates.length === 0) break;

    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    const capacity = Math.min(maxExtra - choice.value, remaining);
    if (capacity <= 0) continue;
    const allocation = Math.min(capacity, Math.floor(Math.random() * capacity) + 1);
    extras[choice.index] += allocation;
    remaining -= allocation;
  }

  if (remaining > 0) {
    // Distribute any rounding leftovers evenly while respecting the cap.
    for (let index = 0; index < parts && remaining > 0; index += 1) {
      const capacity = Math.min(maxExtra - extras[index], remaining);
      if (capacity <= 0) continue;
      extras[index] += capacity;
      remaining -= capacity;
    }
  }

  return extras.map((extra) => extra + normalizedMin);
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
