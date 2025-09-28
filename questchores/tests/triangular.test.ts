import { describe, expect, it } from 'vitest';
import { triangular } from '../src/lib/triangular';
import { mulberry32 } from '../src/lib/rng';

describe('triangular distribution', () => {
  it('stays within bounds', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const value = triangular(2, 5, 10, rng);
      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(10);
    }
  });

  it('biases toward the mode', () => {
    const rng = mulberry32(42);
    let sum = 0;
    const min = 0;
    const mode = 8;
    const max = 10;
    const samples = 1000;
    for (let i = 0; i < samples; i++) {
      sum += triangular(min, mode, max, rng);
    }
    const average = sum / samples;
    const mid = (min + max) / 2;
    expect(average).toBeGreaterThan(mid);
    expect(average).toBeLessThanOrEqual(mode);
  });
});
