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

/**
 * Minimum edge weight in the navigation graph.
 * Prevents zero-cost edges so even empty zones have routing cost,
 * ensuring Dijkstra prefers shorter paths when congestion is equal.
 */
const DIJKSTRA_BASE_EDGE_WEIGHT = 0.1;

/**
 * Derive zone status from occupancy ratio.
 * This is the single source of truth — all UI indicators derive from this.
 *
 * @param currentOccupancy - Current number of people in the zone
 * @param capacity - Maximum capacity of the zone
 * @returns Derived zone status
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

/**
 * Dijkstra's algorithm for finding the least-congested path between two zones.
 *
 * Each zone is a node. Edges connect adjacent zones. Edge weight = congestion
 * ratio of the destination zone. This means the algorithm avoids routing
 * through heavily congested zones.
 *
 * @param zones - Map of zone ID to zone data
 * @param startZoneId - Starting zone ID
 * @param endZoneId - Destination zone ID
 * @returns Ordered path of zones with their status, or null if no path exists
 */
export function findLeastCongestedPath(
  zones: Map<string, { name: string; currentOccupancy: number; capacity: number; status: ZoneStatus; waitTimeMinutes: number; adjacentZones: string[] }>,
  startZoneId: string,
  endZoneId: string
): { path: Array<{ zoneId: string; zoneName: string; status: ZoneStatus; waitTimeMinutes: number }>; totalCongestionScore: number } | null {
  if (!zones.has(startZoneId) || !zones.has(endZoneId)) {
    return null;
  }

  if (startZoneId === endZoneId) {
    const zone = zones.get(startZoneId)!;
    return {
      path: [{ zoneId: startZoneId, zoneName: zone.name, status: zone.status, waitTimeMinutes: zone.waitTimeMinutes }],
      totalCongestionScore: 0,
    };
  }

  // Dijkstra's algorithm
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  for (const [id] of zones) {
    distances.set(id, Infinity);
    previous.set(id, null);
    unvisited.add(id);
  }
  distances.set(startZoneId, 0);

  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let currentId: string | null = null;
    let currentDist = Infinity;
    for (const id of unvisited) {
      const dist = distances.get(id) ?? Infinity;
      if (dist < currentDist) {
        currentDist = dist;
        currentId = id;
      }
    }

    if (currentId === null || currentDist === Infinity) break;
    if (currentId === endZoneId) break;

    unvisited.delete(currentId);
    const currentZone = zones.get(currentId)!;

    for (const neighborId of currentZone.adjacentZones) {
      if (!unvisited.has(neighborId)) continue;
      const neighbor = zones.get(neighborId);
      if (!neighbor) continue;

      // Edge weight = congestion ratio of the destination zone
      // Add a small base weight (0.1) so zero-congestion paths still have cost
      const edgeWeight = DIJKSTRA_BASE_EDGE_WEIGHT + congestionRatio(neighbor.currentOccupancy, neighbor.capacity);
      const tentativeDist = currentDist + edgeWeight;

      if (tentativeDist < (distances.get(neighborId) ?? Infinity)) {
        distances.set(neighborId, tentativeDist);
        previous.set(neighborId, currentId);
      }
    }
  }

  // Reconstruct path
  const path: Array<{ zoneId: string; zoneName: string; status: ZoneStatus; waitTimeMinutes: number }> = [];
  let current: string | null = endZoneId;

  while (current !== null) {
    const zone = zones.get(current)!;
    path.unshift({
      zoneId: current,
      zoneName: zone.name,
      status: zone.status,
      waitTimeMinutes: zone.waitTimeMinutes,
    });
    current = previous.get(current) ?? null;
  }

  // Verify path starts at the start zone
  if (path.length === 0 || path[0]?.zoneId !== startZoneId) {
    return null; // No path found
  }

  return {
    path,
    totalCongestionScore: Math.round((distances.get(endZoneId) ?? 0) * 100) / 100,
  };
}
