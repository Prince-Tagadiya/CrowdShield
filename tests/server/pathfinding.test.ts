import { describe, it, expect } from 'vitest';
import { findShortestPath } from '../../server/src/services/pathfinder';
import { Zone } from '../../server/src/types';

describe('Dijkstra Pathfinding Algorithm', () => {
  const mockZones: Zone[] = [
    {
      id: 'z1',
      name: 'North Gate',
      type: 'entry',
      capacity: 1000,
      currentOccupancy: 100,
      status: 'clear',
      waitTimeMinutes: 2,
      coordinates: { lat: 0, lng: 0 },
      lastUpdated: Date.now(),
      updatedBy: 'system',
      adjacentZones: ['z2', 'z3']
    },
    {
      id: 'z2',
      name: 'East Corridor',
      type: 'concession',
      capacity: 1000,
      currentOccupancy: 850,
      status: 'crowded',
      waitTimeMinutes: 15,
      coordinates: { lat: 1, lng: 1 },
      lastUpdated: Date.now(),
      updatedBy: 'system',
      adjacentZones: ['z1', 'z4']
    },
    {
      id: 'z3',
      name: 'West Corridor',
      type: 'concession',
      capacity: 1000,
      currentOccupancy: 200,
      status: 'clear',
      waitTimeMinutes: 3,
      coordinates: { lat: -1, lng: -1 },
      lastUpdated: Date.now(),
      updatedBy: 'system',
      adjacentZones: ['z1', 'z4']
    },
    {
      id: 'z4',
      name: 'Main Seating',
      type: 'seating',
      capacity: 5000,
      currentOccupancy: 3000,
      status: 'moderate',
      waitTimeMinutes: 5,
      coordinates: { lat: 0, lng: 2 },
      lastUpdated: Date.now(),
      updatedBy: 'system',
      adjacentZones: ['z2', 'z3']
    }
  ];

  it('should find the least congested path', () => {
    // Path through z3 (West Corridor) is much clearer than z2 (East Corridor)
    const result = findShortestPath('z1', 'z4', mockZones);
    
    expect(result.path.map(p => p.zoneId)).toEqual(['z1', 'z3', 'z4']);
    expect(result.totalCongestionScore).toBeLessThan(1.0); // 0.1 (z1) + 0.2 (z3) + 0.6 (z4)
  });

  it('should handle unreachable zones', () => {
    const isolatedZones = [...mockZones, {
      id: 'z5',
      name: 'Isolated Island',
      type: 'medical',
      capacity: 100,
      currentOccupancy: 0,
      status: 'clear',
      waitTimeMinutes: 0,
      coordinates: { lat: 10, lng: 10 },
      lastUpdated: Date.now(),
      updatedBy: 'system',
      adjacentZones: []
    }];
    
    expect(() => findShortestPath('z1', 'z5', isolatedZones as Zone[])).toThrow('No path found');
  });

  it('should handle zero distance for same start/end', () => {
    const result = findShortestPath('z1', 'z1', mockZones);
    expect(result.path).toHaveLength(1);
    expect(result.path[0].zoneId).toBe('z1');
  });

  it('should prioritize shorter paths if congestion is equal', () => {
    const neutralZones: Zone[] = mockZones.map(z => ({ ...z, currentOccupancy: 500 }));
    const result = findShortestPath('z1', 'z4', neutralZones);
    // Both z2 and z3 have same weight, so any is valid, but logic usually picks first found or shortest hops
    expect(result.path).toBeDefined();
    expect(result.path.length).toBe(3);
  });
});
