import { describe, it, expect } from 'vitest';
import { deriveStatus, estimateWaitTime, congestionRatio, findLeastCongestedPath } from '../../server/src/services/zone-calculator';

describe('deriveStatus', () => {
  it('returns "clear" for ratio below 0.4', () => {
    expect(deriveStatus(300, 1000)).toBe('clear');
    expect(deriveStatus(0, 1000)).toBe('clear');
    expect(deriveStatus(399, 1000)).toBe('clear');
  });

  it('returns "moderate" for ratio between 0.4 and 0.65', () => {
    expect(deriveStatus(400, 1000)).toBe('moderate');
    expect(deriveStatus(500, 1000)).toBe('moderate');
    expect(deriveStatus(649, 1000)).toBe('moderate');
  });

  it('returns "crowded" for ratio between 0.65 and 0.85', () => {
    expect(deriveStatus(650, 1000)).toBe('crowded');
    expect(deriveStatus(750, 1000)).toBe('crowded');
    expect(deriveStatus(849, 1000)).toBe('crowded');
  });

  it('returns "critical" for ratio >= 0.85', () => {
    expect(deriveStatus(850, 1000)).toBe('critical');
    expect(deriveStatus(1000, 1000)).toBe('critical');
    expect(deriveStatus(1100, 1000)).toBe('critical'); // over capacity
  });

  it('returns "clear" for zero capacity', () => {
    expect(deriveStatus(0, 0)).toBe('clear');
    expect(deriveStatus(100, 0)).toBe('clear');
  });

  it('handles negative occupancy gracefully', () => {
    expect(deriveStatus(-10, 1000)).toBe('clear');
  });
});

describe('estimateWaitTime', () => {
  it('returns 0 for zero capacity', () => {
    expect(estimateWaitTime(100, 0, 'entry')).toBe(0);
  });

  it('returns 0 for zero occupancy', () => {
    expect(estimateWaitTime(0, 1000, 'entry')).toBe(0);
  });

  it('increases with occupancy ratio', () => {
    const low = estimateWaitTime(200, 1000, 'concession');
    const mid = estimateWaitTime(500, 1000, 'concession');
    const high = estimateWaitTime(900, 1000, 'concession');
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
  });

  it('uses different base waits for different zone types', () => {
    const entryWait = estimateWaitTime(500, 1000, 'entry');
    const concessionWait = estimateWaitTime(500, 1000, 'concession');
    // Concession has higher base wait (8) than entry (5)
    expect(concessionWait).toBeGreaterThan(entryWait);
  });

  it('returns whole numbers', () => {
    const result = estimateWaitTime(333, 1000, 'restroom');
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe('congestionRatio', () => {
  it('returns 0 for zero capacity', () => {
    expect(congestionRatio(100, 0)).toBe(0);
  });

  it('returns correct ratio', () => {
    expect(congestionRatio(500, 1000)).toBe(0.5);
    expect(congestionRatio(1000, 1000)).toBe(1);
  });

  it('caps at 1 for over-capacity', () => {
    expect(congestionRatio(1500, 1000)).toBe(1);
  });

  it('clamps negative values to 0', () => {
    expect(congestionRatio(-100, 1000)).toBe(0);
  });
});

describe('findLeastCongestedPath', () => {
  const makeZone = (name: string, occ: number, cap: number, adj: string[]) => ({
    name,
    currentOccupancy: occ,
    capacity: cap,
    status: deriveStatus(occ, cap),
    waitTimeMinutes: estimateWaitTime(occ, cap, 'entry'),
    adjacentZones: adj,
  });

  it('returns null for non-existent start zone', () => {
    const zones = new Map();
    zones.set('a', makeZone('A', 100, 1000, ['b']));
    expect(findLeastCongestedPath(zones, 'x', 'a')).toBeNull();
  });

  it('returns single-node path when start equals end', () => {
    const zones = new Map();
    zones.set('a', makeZone('A', 100, 1000, ['b']));
    zones.set('b', makeZone('B', 200, 1000, ['a']));
    const result = findLeastCongestedPath(zones, 'a', 'a');
    expect(result).not.toBeNull();
    expect(result!.path).toHaveLength(1);
    expect(result!.totalCongestionScore).toBe(0);
  });

  it('finds direct path between adjacent zones', () => {
    const zones = new Map();
    zones.set('a', makeZone('A', 100, 1000, ['b']));
    zones.set('b', makeZone('B', 200, 1000, ['a']));
    const result = findLeastCongestedPath(zones, 'a', 'b');
    expect(result).not.toBeNull();
    expect(result!.path).toHaveLength(2);
    expect(result!.path[0]!.zoneId).toBe('a');
    expect(result!.path[1]!.zoneId).toBe('b');
  });

  it('avoids congested zones', () => {
    // A - B(90% full) - D
    //  \              /
    //   C(10% full) -
    const zones = new Map();
    zones.set('a', makeZone('A', 100, 1000, ['b', 'c']));
    zones.set('b', makeZone('B', 900, 1000, ['a', 'd'])); // Very congested
    zones.set('c', makeZone('C', 100, 1000, ['a', 'd'])); // Very clear
    zones.set('d', makeZone('D', 100, 1000, ['b', 'c']));

    const result = findLeastCongestedPath(zones, 'a', 'd');
    expect(result).not.toBeNull();
    // Should route through C (clear) not B (critical)
    const pathIds = result!.path.map(s => s.zoneId);
    expect(pathIds).toContain('c');
    expect(pathIds).not.toContain('b');
  });

  it('returns null when no path exists', () => {
    const zones = new Map();
    zones.set('a', makeZone('A', 100, 1000, [])); // No connections
    zones.set('b', makeZone('B', 100, 1000, []));
    expect(findLeastCongestedPath(zones, 'a', 'b')).toBeNull();
  });
});
