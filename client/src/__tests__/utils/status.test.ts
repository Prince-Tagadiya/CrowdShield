import { describe, it, expect } from 'vitest';
import {
  STATUS_CLASSES,
  STATUS_LABELS,
  STATUS_ICONS,
  SEVERITY_CLASSES,
  ZONE_TYPE_ICONS,
  ZONE_TYPE_LABELS,
  getOccupancyPercent,
} from '../../utils/status';

describe('getOccupancyPercent', () => {
  it('returns 0 for zero capacity', () => {
    expect(getOccupancyPercent(100, 0)).toBe(0);
  });

  it('returns 0 for zero occupancy', () => {
    expect(getOccupancyPercent(0, 1000)).toBe(0);
  });

  it('calculates correct percentage', () => {
    expect(getOccupancyPercent(500, 1000)).toBe(50);
    expect(getOccupancyPercent(250, 1000)).toBe(25);
    expect(getOccupancyPercent(333, 1000)).toBe(33);
  });

  it('caps at 100% for over-capacity', () => {
    expect(getOccupancyPercent(1500, 1000)).toBe(100);
  });

  it('handles negative capacity', () => {
    expect(getOccupancyPercent(100, -1)).toBe(0);
  });

  it('returns whole numbers (no decimals)', () => {
    const result = getOccupancyPercent(333, 1000);
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe('STATUS_CLASSES', () => {
  it('has a CSS class for every status', () => {
    expect(STATUS_CLASSES.clear).toBe('status-clear');
    expect(STATUS_CLASSES.moderate).toBe('status-moderate');
    expect(STATUS_CLASSES.crowded).toBe('status-crowded');
    expect(STATUS_CLASSES.critical).toBe('status-critical');
  });

  it('covers all 4 statuses', () => {
    expect(Object.keys(STATUS_CLASSES)).toHaveLength(4);
  });
});

describe('STATUS_LABELS', () => {
  it('has a human-readable label for every status', () => {
    expect(STATUS_LABELS.clear).toBe('Clear');
    expect(STATUS_LABELS.moderate).toBe('Moderate');
    expect(STATUS_LABELS.crowded).toBe('Crowded');
    expect(STATUS_LABELS.critical).toBe('Critical');
  });
});

describe('STATUS_ICONS', () => {
  it('has an emoji for every status', () => {
    expect(STATUS_ICONS.clear).toBeTruthy();
    expect(STATUS_ICONS.moderate).toBeTruthy();
    expect(STATUS_ICONS.crowded).toBeTruthy();
    expect(STATUS_ICONS.critical).toBeTruthy();
  });
});

describe('SEVERITY_CLASSES', () => {
  it('has a CSS class for every severity level', () => {
    expect(SEVERITY_CLASSES.low).toBe('severity-low');
    expect(SEVERITY_CLASSES.medium).toBe('severity-medium');
    expect(SEVERITY_CLASSES.high).toBe('severity-high');
    expect(SEVERITY_CLASSES.critical).toBe('severity-critical');
  });

  it('covers all 4 severity levels', () => {
    expect(Object.keys(SEVERITY_CLASSES)).toHaveLength(4);
  });
});

describe('ZONE_TYPE_ICONS', () => {
  it('has an icon for every zone type', () => {
    expect(ZONE_TYPE_ICONS.entry).toBeTruthy();
    expect(ZONE_TYPE_ICONS.concession).toBeTruthy();
    expect(ZONE_TYPE_ICONS.restroom).toBeTruthy();
    expect(ZONE_TYPE_ICONS.seating).toBeTruthy();
    expect(ZONE_TYPE_ICONS.medical).toBeTruthy();
  });
});

describe('ZONE_TYPE_LABELS', () => {
  it('has a human-readable label for every zone type', () => {
    expect(ZONE_TYPE_LABELS.entry).toBe('Entry Gate');
    expect(ZONE_TYPE_LABELS.concession).toBe('Food & Drinks');
    expect(ZONE_TYPE_LABELS.restroom).toBe('Restrooms');
    expect(ZONE_TYPE_LABELS.seating).toBe('Seating Area');
    expect(ZONE_TYPE_LABELS.medical).toBe('Medical Center');
  });

  it('covers all 5 zone types', () => {
    expect(Object.keys(ZONE_TYPE_LABELS)).toHaveLength(5);
  });
});
