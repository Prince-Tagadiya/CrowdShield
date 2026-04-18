import { Router, Request, Response } from 'express';
import { getZones, getZone, updateZone, createAlert, clearAlerts, broadcastNotification } from '../services/store';
import { deriveStatus, estimateWaitTime } from '../services/zone-calculator';
import { logError } from '../services/logger';
import type { Zone } from '../types';

import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * POST /api/simulate/chaos
 * Staff-only — triggers a high-impact demo emergency.
 * Instantly floods key zones and triggers AI reactions.
 */
router.post('/chaos', async (_req: Request, res: Response): Promise<void> => {
  try {
    const chaosZones = ['zone-north-entry', 'zone-west-food', 'zone-sachin'];
    const now = Date.now();
    
    // 1. Flood zones
    for (const zoneId of chaosZones) {
      const zone = getZone(zoneId);
      if (zone) {
        const capacity = zone.capacity || 1000;
        updateZone(zoneId, {
          currentOccupancy: Math.floor(capacity * 0.96),
          status: 'critical',
          waitTimeMinutes: 25,
          lastUpdated: now
        });
      }
    }

    // 2. Trigger high-priority alert
    const alertId = 'chaos-' + now;
    createAlert(alertId, {
      id: alertId,
      zoneId: 'zone-sachin',
      type: 'overcrowding',
      severity: 'critical',
      description: 'SUDDEN CROWD SURGE DETECTED: Sachin Tendulkar Stand restrooms at 96% capacity. Restricted outward flow through South Gates. Stampede risk HIGH.',
      status: 'active',
      createdAt: now,
      createdBy: 'system-demo',
      resolvedAt: null,
      resolvedBy: null
    });

    // 3. Notify all attendees (Broadcasting)
    broadcastNotification(
      '🚨 EMERGENCY EVACUATION ADVISORY',
      'High density detected in South Stands. ALL ATTENDEES are advised to use the North Stand Entry (Gate A) for exit. Follow staff instructions.',
      'emergency'
    );

    res.json({ message: 'Chaos mode activated 🚨' });
  } catch (error) {
    logError('Chaos simulation failure', error);
    res.status(500).json({ error: 'Failed to initiate chaos' });
  }
});

/**
 * POST /api/simulate/reset
 * Staff-only — resets the stadium to a safe state.
 */
router.post('/reset', async (_req: Request, res: Response): Promise<void> => {
  try {
    const zones = getZones();
    
    for (const id in zones) {
      updateZone(id, {
        currentOccupancy: Math.floor(zones[id].capacity * 0.2),
        status: 'clear',
        waitTimeMinutes: 1,
        lastUpdated: Date.now()
      });
    }

    // Clear alerts
    clearAlerts();
    
    res.json({ message: 'Stadium reset to safe state ✅' });
  } catch (error) {
    res.status(500).json({ error: 'Reset failed' });
  }
});

/**
 * POST /api/simulate/tick
 * Public endpoint — shifts all zone occupancies by a random ±1-8% to simulate
 * real-time crowd movement. Call this on an interval from the client to make
 * the demo feel alive during judging.
 */
router.post('/tick', async (_req: Request, res: Response): Promise<void> => {
  try {
    const zonesData = getZones();

    if (!zonesData || Object.keys(zonesData).length === 0) {
      res.status(404).json({ error: 'No zones configured' });
      return;
    }

    const updates: Record<string, unknown> = {};
    const results: Array<{ id: string; name: string; occupancy: number; status: string }> = [];

    for (const [id, data] of Object.entries(zonesData)) {
      const zone = data as Zone;
      const capacity = zone.capacity;

      // Random walk: shift occupancy by -8% to +8% of capacity
      const maxShift = Math.max(1, Math.floor(capacity * 0.08));
      const shift = Math.floor(Math.random() * (maxShift * 2 + 1)) - maxShift;
      const newOccupancy = Math.max(0, Math.min(capacity, zone.currentOccupancy + shift));

      const status = deriveStatus(newOccupancy, capacity);
      const waitTimeMinutes = estimateWaitTime(newOccupancy, capacity, zone.type);

      updateZone(id, {
        currentOccupancy: newOccupancy,
        status,
        waitTimeMinutes,
        lastUpdated: Date.now(),
        updatedBy: 'simulation'
      });

      results.push({ id, name: zone.name, occupancy: newOccupancy, status });
    }

    res.json({ updated: results.length, zones: results });
  } catch (error) {
    logError('Simulation tick error', error);
    res.status(500).json({ error: 'Simulation tick failed' });
  }
});

export default router;
