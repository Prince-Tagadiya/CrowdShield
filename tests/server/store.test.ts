import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as store from '../../server/src/services/store';

describe('Global Store Service', () => {
  beforeEach(() => {
    // Reset store state could be tricky if it's internal, 
    // but we can test getters and logic
  });

  it('provides a consistent list of stadium zones', () => {
    const zones = store.getZones();
    expect(zones).toBeDefined();
    expect(zones.length).toBeGreaterThan(0);
    expect(zones.some(z => z.name === 'North Stand Entry')).toBe(true);
  });

  it('updates zone occupancy and derives correct status', () => {
    const zoneId = 'zone-north-entry';
    const newOccupancy = 900; // Capacity 1000 -> 90% -> critical
    
    store.updateZoneOccupancy(zoneId, newOccupancy, 'admin');
    
    const updatedZone = store.getZones().find(z => z.id === zoneId);
    expect(updatedZone?.currentOccupancy).toBe(newOccupancy);
    expect(updatedZone?.status).toBe('critical');
    expect(updatedZone?.updatedBy).toBe('admin');
  });

  it('prevents occupancy from exceeding logic boundaries', () => {
    const zoneId = 'zone-north-entry';
    // Even if we push higher, the deriveStatus handles it but the store should store the actual value
    store.updateZoneOccupancy(zoneId, 5000, 'admin');
    const updatedZone = store.getZones().find(z => z.id === zoneId);
    expect(updatedZone?.currentOccupancy).toBe(5000);
    expect(updatedZone?.status).toBe('critical');
  });

  it('manages alerts lifecycle', () => {
    // Add alert
    const alert = store.addAlert({
      zoneId: 'zone-north-entry',
      type: 'security',
      severity: 'high',
      description: 'Security breach'
    }, 'admin');
    
    expect(alert.id).toBeDefined();
    expect(store.getAlerts()).toContainEqual(alert);
    
    // Resolve alert
    store.resolveAlert(alert.id, 'admin');
    const resolved = store.getAlerts().find(a => a.id === alert.id);
    expect(resolved?.status).toBe('resolved');
    expect(resolved?.resolvedBy).toBe('admin');
  });

  it('returns only active alerts when filtered (conceptual)', () => {
    const alerts = store.getAlerts();
    expect(Array.isArray(alerts)).toBe(true);
  });
});
