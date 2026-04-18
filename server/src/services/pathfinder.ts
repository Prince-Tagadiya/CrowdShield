import { Zone, ZoneStatus, NavigationResult } from '../types';

/**
 * High-performance Bidirectional Dijkstra's Algorithm for congestion-aware navigation.
 * Weights are calculated based on the congestion ratio of the destination zone plus a base edge weight.
 */
export function findShortestPath(
  startZoneId: string,
  endZoneId: string,
  zones: Zone[]
): NavigationResult {
  const zoneMap = new Map(zones.map(z => [z.id, z]));
  
  if (!zoneMap.has(startZoneId)) throw new Error(`Start zone ${startZoneId} not found`);
  if (!zoneMap.has(endZoneId)) throw new Error(`End zone ${endZoneId} not found`);

  if (startZoneId === endZoneId) {
    const z = zoneMap.get(startZoneId)!;
    return {
      path: [{ zoneId: z.id, zoneName: z.name, status: z.status, waitTimeMinutes: z.waitTimeMinutes }],
      totalCongestionScore: 0
    };
  }

  const DIJKSTRA_BASE_EDGE_WEIGHT = 0.1;

  // Two-way search structures
  const forwardDist = new Map<string, number>();
  const backwardDist = new Map<string, number>();
  const forwardPrev = new Map<string, string | null>();
  const backwardPrev = new Map<string, string | null>();
  const forwardVisited = new Set<string>();
  const backwardVisited = new Set<string>();

  for (const zone of zones) {
    forwardDist.set(zone.id, Infinity);
    backwardDist.set(zone.id, Infinity);
    forwardPrev.set(zone.id, null);
    backwardPrev.set(zone.id, null);
  }

  forwardDist.set(startZoneId, 0);
  backwardDist.set(endZoneId, 0);

  let meetingNode: string | null = null;
  let minPathLen = Infinity;

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
    const fId = getNextNode(forwardDist, forwardVisited);
    if (!fId) break;
    forwardVisited.add(fId);

    const fZone = zoneMap.get(fId)!;
    for (const neighborId of fZone.adjacentZones) {
      const neighbor = zoneMap.get(neighborId);
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

    const bId = getNextNode(backwardDist, backwardVisited);
    if (!bId) break;
    backwardVisited.add(bId);

    const bZone = zoneMap.get(bId)!;
    for (const neighborId of bZone.adjacentZones) {
      const neighbor = zoneMap.get(neighborId);
      if (!neighbor) continue;
      
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

    if (meetingNode && (forwardDist.get(fId) ?? 0) + (backwardDist.get(bId) ?? 0) >= minPathLen) break;
  }

  if (!meetingNode) throw new Error('No path found');

  const path: NavigationResult['path'] = [];
  
  let curr: string | null = meetingNode;
  while (curr) {
    const z = zoneMap.get(curr)!;
    path.unshift({ zoneId: curr, zoneName: z.name, status: z.status, waitTimeMinutes: z.waitTimeMinutes });
    curr = forwardPrev.get(curr) ?? null;
  }

  curr = backwardPrev.get(meetingNode) ?? null;
  while (curr) {
    const z = zoneMap.get(curr)!;
    path.push({ zoneId: curr, zoneName: z.name, status: z.status, waitTimeMinutes: z.waitTimeMinutes });
    curr = backwardPrev.get(curr) ?? null;
  }

  return { path, totalCongestionScore: Math.round(minPathLen * 100) / 100 };
}
