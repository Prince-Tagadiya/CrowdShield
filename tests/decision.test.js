import { describe, expect, it } from 'vitest';
import {
  calculateScore,
  getBestGate,
  getBestExit,
  getBestFood,
  getBestWashroom,
  validateLocation,
} from '../src/decision.js';

describe('decision engine', () => {
  it('prefers the lower weighted score', () => {
    const best = getBestGate([
      { id: 'a', name: 'Gate A', level: 'high', wait: 20, dist: 100 },
      { id: 'b', name: 'Gate B', level: 'low', wait: 3, dist: 120 },
    ]);

    expect(best.id).toBe('b');
  });

  it('returns scored output with a stable numeric score', () => {
    const score = calculateScore({ id: 'x', name: 'Gate', level: 'med', wait: 11, dist: 220 });
    expect(score.score).toBeTypeOf('number');
    expect(score.score).toBeGreaterThan(0);
  });

  it('returns built-in options for attendee guidance helpers', () => {
    expect(getBestExit()).not.toBeNull();
    expect(getBestFood()).not.toBeNull();
    expect(getBestWashroom()).not.toBeNull();
  });

  it('sanitizes unsafe location input', () => {
    expect(validateLocation('<b>Gate A</b>')).toBe('bGate A/b');
    expect(validateLocation('')).toBe('Unknown Area');
  });
});
