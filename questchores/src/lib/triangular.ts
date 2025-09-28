export function triangular(min: number, mode: number, max: number, rng: () => number): number {
  if (max <= min) return min;
  const u = rng();
  const c = (mode - min) / (max - min);
  if (u <= c) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  }
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}
