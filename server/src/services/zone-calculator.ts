import { ZoneStatus } from '../types';

/** Thresholds for deriving zone status from occupancy ratio */
const STATUS_THRESHOLDS = {
  clear: 0.4,
  moderate: 0.65,
  crowded: 0.85,
} as const;

/** Base wait time multiplier per zone type (minutes) */
const BASE_WAIT_MINUTES: Record<string, number> = {
  entry: 5,
  concession: 8,
  restroom: 6,
  seating: 2,
  medical: 10,
};

/**
 * Wait time grows exponentially (ratio^EXPONENT) to model the nonlinear
 * relationship between crowd density and service time.
 */
const WAIT_TIME_EXPONENT = 1.5;

 */
export function deriveStatus(currentOccupancy: number, capacity: number): ZoneStatus {
  if (capacity <= 0) return 'clear';
  const ratio = Math.max(0, Math.min(currentOccupancy / capacity, 1));

  if (ratio < STATUS_THRESHOLDS.clear) return 'clear';
  if (ratio < STATUS_THRESHOLDS.moderate) return 'moderate';
  if (ratio < STATUS_THRESHOLDS.crowded) return 'crowded';
  return 'critical';
}

/**
 * Estimate wait time based on occupancy ratio.
 * Uses exponential growth (ratio^1.5) to model the nonlinear relationship
 * between crowd density and service time.
 *
 * @param currentOccupancy - Current number of people in the zone
 * @param capacity - Maximum capacity of the zone
 * @param zoneType - Type of zone (affects base wait time)
 * @returns Estimated wait time in minutes
 */
export function estimateWaitTime(
  currentOccupancy: number,
  capacity: number,
  zoneType: string
): number {
  if (capacity <= 0) return 0;
  const ratio = Math.max(0, Math.min(currentOccupancy / capacity, 1));
  const baseWait = BASE_WAIT_MINUTES[zoneType] ?? 5;
  return Math.round(baseWait * Math.pow(ratio, WAIT_TIME_EXPONENT));
}

/**
 * Calculate congestion ratio (0–1) for a zone.
 * Used as edge weight in the navigation graph.
 */
export function congestionRatio(currentOccupancy: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.max(0, Math.min(currentOccupancy / capacity, 1));
}

