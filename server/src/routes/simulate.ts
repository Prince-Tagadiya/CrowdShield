import { Router, Request, Response } from 'express';
import { db } from '../services/firebase-admin';
import { deriveStatus, estimateWaitTime } from '../services/zone-calculator';
import { logError } from '../services/logger';
import type { Zone } from '../types';

const router = Router();

/**
 * POST /api/simulate/tick
 * Public endpoint — shifts all zone occupancies by a random ±1-8% to simulate
 * real-time crowd movement. Call this on an interval from the client to make
 * the demo feel alive during judging.
 */
router.post('/tick', async (_req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await db.ref('zones').once('value');
    const zonesData = snapshot.val();

    if (!zonesData) {
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

      updates[`zones/${id}/currentOccupancy`] = newOccupancy;
      updates[`zones/${id}/status`] = status;
      updates[`zones/${id}/waitTimeMinutes`] = waitTimeMinutes;
      updates[`zones/${id}/lastUpdated`] = Date.now();
      updates[`zones/${id}/updatedBy`] = 'simulation';

      results.push({ id, name: zone.name, occupancy: newOccupancy, status });
    }

    await db.ref().update(updates);
    res.json({ updated: results.length, zones: results });
  } catch (error) {
    logError('Simulation tick error', error);
    res.status(500).json({ error: 'Simulation tick failed' });
  }
});

export default router;
