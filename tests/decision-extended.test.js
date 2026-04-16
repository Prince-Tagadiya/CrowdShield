import { describe, expect, it } from 'vitest';
import {
  calculateScore,
  getBestOption,
  getBestGate,
  getBestExit,
  getBestFood,
  getBestWashroom,
  getTeamsForEvent,
  validateLocation,
} from '../src/decision.js';
import { EXITS, FOOD_STALLS, GATES, WASHROOMS } from '../src/data.js';

describe('decision engine extended coverage', () => {
  it.each([
    [{ id: 'a', level: 'low', wait: 0, dist: 0 }, 2],
    [{ id: 'b', level: 'med', wait: 10, dist: 100 }, 13],
    [{ id: 'c', level: 'high', wait: 20, dist: 200 }, 26],
    [{ id: 'd', level: 'unknown', wait: 8, dist: 40 }, 7.2],
  ])('calculates stable score for %o', (item, expected) => {
    expect(calculateScore(item).score).toBe(expected);
  });

  it.each([
    [[
      { id: 'a', level: 'high', wait: 30, dist: 100 },
      { id: 'b', level: 'low', wait: 4, dist: 100 },
    ], 'b'],
    [[
      { id: 'a', level: 'med', wait: 10, dist: 300 },
      { id: 'b', level: 'med', wait: 9, dist: 320 },
    ], 'a'],
    [[
      { id: 'a', level: 'low', wait: 7, dist: 200 },
      { id: 'b', level: 'low', wait: 7, dist: 150 },
    ], 'b'],
    [[
      { id: 'a', level: 'high', wait: 6, dist: 100 },
      { id: 'b', level: 'med', wait: 6, dist: 100 },
    ], 'b'],
  ])('selects best option from candidates', (options, expectedId) => {
    expect(getBestOption(options)?.id).toBe(expectedId);
  });

  it.each([
    [null, null],
    [undefined, null],
    [[], null],
  ])('returns null for empty option sets', (options, expected) => {
    expect(getBestOption(options)).toBe(expected);
  });

  it('uses built-in data sets for helpers', () => {
    expect(getBestGate()?.id).toBeTruthy();
    expect(getBestExit()?.id).toBe(EXITS.map(calculateScore).sort((a, b) => a.score - b.score)[0].id);
    expect(getBestFood()?.id).toBe(FOOD_STALLS.map(calculateScore).sort((a, b) => a.score - b.score)[0].id);
    expect(getBestWashroom()?.id).toBe(WASHROOMS.map(calculateScore).sort((a, b) => a.score - b.score)[0].id);
  });

  it('prefers override gate data when provided', () => {
    const override = [
      { id: 'x', name: 'Gate X', level: 'high', wait: 30, dist: 30 },
      { id: 'y', name: 'Gate Y', level: 'low', wait: 4, dist: 90 },
    ];
    expect(getBestGate(override)?.id).toBe('y');
    expect(getBestGate(override)?.id).not.toBe(GATES[0].id);
  });

  it.each([
    ['fire', ['fire', 'police']],
    ['medical', ['medical']],
    ['crowd', ['police']],
    ['lost', ['police']],
    ['security', ['police']],
    ['unknown', ['police']],
    ['', ['police']],
  ])('maps event type %s to teams %j', (type, expected) => {
    expect(getTeamsForEvent(type)).toEqual(expected);
  });

  it.each([
    ['Gate A', 'Gate A'],
    ['  Gate B  ', 'Gate B'],
    ['<Gate C>', 'Gate C'],
    ['<script>alert(1)</script>', 'scriptalert(1)/script'],
    ['North Exit <b>', 'North Exit b'],
    ['', 'Unknown Area'],
    ['   ', 'Unknown Area'],
    [null, 'Unknown Area'],
    [undefined, 'Unknown Area'],
    [42, 'Unknown Area'],
  ])('sanitizes location input %o', (input, expected) => {
    expect(validateLocation(input)).toBe(expected);
  });
});
