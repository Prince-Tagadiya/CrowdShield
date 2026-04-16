import type { ZoneStatus, AlertSeverity, ZoneType } from '../types';

/** Status → CSS class mapping */
export const STATUS_CLASSES: Record<ZoneStatus, string> = {
  clear: 'status-clear',
  moderate: 'status-moderate',
  crowded: 'status-crowded',
  critical: 'status-critical',
};

/** Status → human-readable label */
export const STATUS_LABELS: Record<ZoneStatus, string> = {
  clear: 'Clear',
  moderate: 'Moderate',
  crowded: 'Crowded',
  critical: 'Critical',
};

/** Status → emoji indicator (accessibility: not sole indicator, paired with text) */
export const STATUS_ICONS: Record<ZoneStatus, string> = {
  clear: '🟢',
  moderate: '🟡',
  crowded: '🟠',
  critical: '🔴',
};

/** Alert severity → CSS class */
export const SEVERITY_CLASSES: Record<AlertSeverity, string> = {
  low: 'severity-low',
  medium: 'severity-medium',
  high: 'severity-high',
  critical: 'severity-critical',
};

/** Zone type → emoji icon */
export const ZONE_TYPE_ICONS: Record<ZoneType, string> = {
  entry: '🚪',
  concession: '🍔',
  restroom: '🚻',
  seating: '💺',
  medical: '🏥',
};

/** Zone type → human-readable label */
export const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  entry: 'Entry Gate',
  concession: 'Food & Drinks',
  restroom: 'Restrooms',
  seating: 'Seating Area',
  medical: 'Medical Center',
};

/**
 * Get the occupancy percentage for a zone.
 */
export function getOccupancyPercent(currentOccupancy: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(Math.round((currentOccupancy / capacity) * 100), 100);
}
