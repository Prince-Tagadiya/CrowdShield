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
 * Bidirectional Dijkstra's algorithm for finding the least-congested path.
 * Searches from both start and end points simultaneously to optimize speed
 * in complex venue graphs. 
 *
 * Edge weight = congestion ratio of the destination zone + small base weight.
 */
export function findLeastCongestedPath(
  zones: Map<string, { name: string; currentOccupancy: number; capacity: number; status: ZoneStatus; waitTimeMinutes: number; adjacentZones: string[] }>,
  startZoneId: string,
  endZoneId: string
): { path: Array<{ zoneId: string; zoneName: string; status: ZoneStatus; waitTimeMinutes: number }>; totalCongestionScore: number } | null {
  if (!zones.has(startZoneId) || !zones.has(endZoneId)) return null;
  if (startZoneId === endZoneId) {
    const zone = zones.get(startZoneId)!;
    return {
      path: [{ zoneId: startZoneId, zoneName: zone.name, status: zone.status, waitTimeMinutes: zone.waitTimeMinutes }],
      totalCongestionScore: 0,
    };
  }

  // Two-way search structures
  const forwardDist = new Map<string, number>();
  const backwardDist = new Map<string, number>();
  const forwardPrev = new Map<string, string | null>();
  const backwardPrev = new Map<string, string | null>();
  const forwardVisited = new Set<string>();
  const backwardVisited = new Set<string>();

  for (const [id] of zones) {
    forwardDist.set(id, Infinity);
    backwardDist.set(id, Infinity);
    forwardPrev.set(id, null);
    backwardPrev.set(id, null);
  }

  forwardDist.set(startZoneId, 0);
  backwardDist.set(endZoneId, 0);

  let meetingNode: string | null = null;
  let minPathLen = Infinity;

  // Expansion queue logic
  const getNextNode = (distMap: Map<string, number>, visited: Set<string>) => {
    let bestId: string | null = null;
    let bestDist = Infinity;
    for (const [id, d] of distMap) {
      if (!visited.has(id) && d < bestDist) {
        bestDist = d;
        bestId = id;
      }
    }
    return bestId;
  };

  while (true) {
    // Forward Expansion
    const fId = getNextNode(forwardDist, forwardVisited);
    if (!fId) break;
    forwardVisited.add(fId);

    const fZone = zones.get(fId)!;
    for (const neighborId of fZone.adjacentZones) {
      const neighbor = zones.get(neighborId);
      if (!neighbor) continue;
      const weight = DIJKSTRA_BASE_EDGE_WEIGHT + (neighbor.currentOccupancy / neighbor.capacity);
      const newDist = (forwardDist.get(fId) ?? 0) + weight;
      if (newDist < (forwardDist.get(neighborId) ?? Infinity)) {
        forwardDist.set(neighborId, newDist);
        forwardPrev.set(neighborId, fId);
      }
      if (backwardVisited.has(neighborId)) {
        const total = newDist + (backwardDist.get(neighborId) ?? 0);
        if (total < minPathLen) {
          minPathLen = total;
          meetingNode = neighborId;
        }
      }
    }

    // Backward Expansion
    const bId = getNextNode(backwardDist, backwardVisited);
    if (!bId) break;
    backwardVisited.add(bId);

    const bZone = zones.get(bId)!;
    // For backward search on un-directed graph (adjacentZones works both ways)
    for (const neighborId of bZone.adjacentZones) {
      const neighbor = zones.get(neighborId);
      if (!neighbor) continue;
      // In backward search, the cost of going TO bId is the cost of bId itself
      const weight = DIJKSTRA_BASE_EDGE_WEIGHT + (bZone.currentOccupancy / bZone.capacity);
      const newDist = (backwardDist.get(bId) ?? 0) + weight;
      if (newDist < (backwardDist.get(neighborId) ?? Infinity)) {
        backwardDist.set(neighborId, newDist);
        backwardPrev.set(neighborId, bId);
      }
      if (forwardVisited.has(neighborId)) {
        const total = newDist + (forwardDist.get(neighborId) ?? 0);
        if (total < minPathLen) {
          minPathLen = total;
          meetingNode = neighborId;
        }
      }
    }

    // Termination condition
    if (meetingNode && (forwardDist.get(fId) ?? 0) + (backwardDist.get(bId) ?? 0) >= minPathLen) break;
  }

  if (!meetingNode) return null;

  // Reconstruct path
  const path: Array<{ zoneId: string; zoneName: string; status: ZoneStatus; waitTimeMinutes: number }> = [];
  
  // Reconstruct from start to meetingNode
  let curr: string | null = meetingNode;
  while (curr) {
    const z = zones.get(curr)!;
    path.unshift({ zoneId: curr, zoneName: z.name, status: z.status, waitTimeMinutes: z.waitTimeMinutes });
    curr = forwardPrev.get(curr) ?? null;
  }

  // Reconstruct from meetingNode to end
  curr = backwardPrev.get(meetingNode) ?? null;
  while (curr) {
    const z = zones.get(curr)!;
    path.push({ zoneId: curr, zoneName: z.name, status: z.status, waitTimeMinutes: z.waitTimeMinutes });
    curr = backwardPrev.get(curr) ?? null;
  }

  return { path, totalCongestionScore: Math.round(minPathLen * 100) / 100 };
}
