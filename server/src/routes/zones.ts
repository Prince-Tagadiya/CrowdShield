import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../services/firebase-admin';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { deriveStatus, estimateWaitTime, findLeastCongestedPath } from '../services/zone-calculator';
import { logError } from '../services/logger';
import type { Zone } from '../types';

const router = Router();

export const updateOccupancySchema = z.object({
  currentOccupancy: z.number().int().min(0).max(100000),
});

export const navigationSchema = z.object({
  startZoneId: z.string().min(1),
  endZoneId: z.string().min(1),
});

/**
 * GET /api/zones
 * Public — returns all zones with current status.
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await db.ref('zones').once('value');
    const zonesData = snapshot.val();

    if (!zonesData) {
      res.json([]);
      return;
    }

    const zones: Zone[] = Object.entries(zonesData).map(([id, data]) => ({
      id,
      ...(data as Omit<Zone, 'id'>),
    }));

    res.json(zones);
  } catch (error) {
    logError('Error fetching zones', error);
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

/**
 * PATCH /api/zones/:id/occupancy
 * Staff-only — update zone occupancy. Status and wait time are auto-derived.
 */
router.patch(
  '/:id/occupancy',
  requireAuth,
  validate(updateOccupancySchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { currentOccupancy } = req.body;

      // Get current zone data to access capacity and type
      const snapshot = await db.ref(`zones/${id}`).once('value');
      const zoneData = snapshot.val();

      if (!zoneData) {
        res.status(404).json({ error: `Zone ${id} not found` });
        return;
      }

      const capacity = zoneData.capacity as number;
      const zoneType = zoneData.type as string;

      // Derive status and wait time from occupancy (single source of truth)
      const status = deriveStatus(currentOccupancy, capacity);
      const waitTimeMinutes = estimateWaitTime(currentOccupancy, capacity, zoneType);

      const updates = {
        currentOccupancy,
        status,
        waitTimeMinutes,
        lastUpdated: Date.now(),
        updatedBy: req.auth!.uid,
      };

      await db.ref(`zones/${id}`).update(updates);

      res.json({ id, ...updates });
    } catch (error) {
      logError('Error updating zone occupancy', error, { zoneId: req.params.id });
      res.status(500).json({ error: 'Failed to update zone occupancy' });
    }
  }
);

/**
 * POST /api/zones/navigate
 * Public — find least-congested path between two zones using Dijkstra's algorithm.
 */
router.post(
  '/navigate',
  validate(navigationSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { startZoneId, endZoneId } = req.body;

      const snapshot = await db.ref('zones').once('value');
      const zonesData = snapshot.val();

      if (!zonesData) {
        res.status(404).json({ error: 'No zones configured' });
        return;
      }

      // Build zone map for Dijkstra
      const zoneMap = new Map<string, {
        name: string;
        currentOccupancy: number;
        capacity: number;
        status: Zone['status'];
        waitTimeMinutes: number;
        adjacentZones: string[];
      }>();

      for (const [id, data] of Object.entries(zonesData)) {
        const zone = data as Zone;
        zoneMap.set(id, {
          name: zone.name,
          currentOccupancy: zone.currentOccupancy,
          capacity: zone.capacity,
          status: zone.status,
          waitTimeMinutes: zone.waitTimeMinutes,
          adjacentZones: zone.adjacentZones || [],
        });
      }

      const result = findLeastCongestedPath(zoneMap, startZoneId, endZoneId);

      if (!result) {
        res.status(404).json({ error: 'No path found between the specified zones' });
        return;
      }

      res.json(result);
    } catch (error) {
      logError('Error computing navigation', error);
      res.status(500).json({ error: 'Failed to compute navigation path' });
    }
  }
);

export default router;
