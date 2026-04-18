import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getZones, getZone, getAlerts, getAlert, createAlert, updateAlert } from '../services/store';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { triageAlert } from '../services/gemini';
import { logError } from '../services/logger';
import type { Zone, Alert, AlertTriage } from '../types';

const router = Router();

export const createAlertSchema = z.object({
  zoneId: z.string().min(1, 'Zone ID is required'),
  type: z.enum(['medical', 'security', 'maintenance', 'overcrowding']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string().min(5, 'Description must be at least 5 characters').max(500),
});

/**
 * GET /api/alerts
 * Staff-only — returns all alerts, optionally filtered by status.
 */
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const alertsData = getAlerts();

    if (!alertsData) {
      res.json([]);
      return;
    }

    let alerts: Alert[] = Object.entries(alertsData).map(([id, data]) => ({
      id,
      ...(data as Omit<Alert, 'id'>),
    }));

    if (statusFilter) {
      alerts = alerts.filter(a => a.status === statusFilter);
    }

    // Sort by creation time descending (newest first)
    alerts.sort((a, b) => b.createdAt - a.createdAt);

    res.json(alerts);
  } catch (error: unknown) {
    logError('Error fetching alerts', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * POST /api/alerts
 * Staff-only — create a new alert. Triggers AI triage if zone is crowded/critical.
 */
router.post(
  '/',
  requireAuth,
  validate(createAlertSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { zoneId, type, severity, description } = req.body;

      // Verify the zone exists
      const zoneData = getZone(zoneId);

      if (!zoneData) {
        res.status(404).json({ error: `Zone ${zoneId} not found` });
        return;
      }

      const alertId = 'alert-' + Date.now();

      const alert: Omit<Alert, 'id'> = {
        zoneId,
        type,
        severity,
        description,
        status: 'active',
        createdBy: req.auth!.uid,
        createdAt: Date.now(),
        resolvedAt: null,
        resolvedBy: null,
      };

      createAlert(alertId, { id: alertId, ...alert });

      // Debounced AI triage: only trigger if zone is crowded or critical
      let triageResponse: AlertTriage | null = null;
      const zoneStatus = zoneData.status as string;

      if (zoneStatus === 'crowded' || zoneStatus === 'critical') {
        // Fetch all zones for context
        const allZonesData = getZones() || {};
        const zones: Zone[] = Object.entries(allZonesData).map(([id, data]) => ({
          id,
          ...(data as Omit<Zone, 'id'>),
        }));

        triageResponse = await triageAlert({ id: alertId, ...alert } as Alert, zones);
      }

      res.status(201).json({
        id: alertId,
        ...alert,
        ...(triageResponse ? { triageAdvice: triageResponse } : {}),
      });
    } catch (error: unknown) {
      logError('Error creating alert', error);
      res.status(500).json({ error: 'Failed to create alert' });
    }
  }
);

/**
 * PATCH /api/alerts/:id/acknowledge
 * Staff-only — acknowledge an alert.
 */
router.patch(
  '/:id/acknowledge',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const alert = getAlert(id);

      if (!alert) {
        res.status(404).json({ error: `Alert ${id} not found` });
        return;
      }

      updateAlert(id, {
        status: 'acknowledged',
      });

      res.json({ id, status: 'acknowledged' });
    } catch (error: unknown) {
      logError('Error acknowledging alert', error, { alertId: req.params.id });
      res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
  }
);

/**
 * PATCH /api/alerts/:id/resolve
 * Staff-only — resolve an alert.
 */
router.patch(
  '/:id/resolve',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const alert = getAlert(id);

      if (!alert) {
        res.status(404).json({ error: `Alert ${id} not found` });
        return;
      }

      updateAlert(id, {
        status: 'resolved',
        resolvedAt: Date.now(),
        resolvedBy: req.auth!.uid,
      });

      res.json({ id, status: 'resolved', resolvedAt: Date.now() });
    } catch (error: unknown) {
      logError('Error resolving alert', error, { alertId: req.params.id });
      res.status(500).json({ error: 'Failed to resolve alert' });
    }
  }
);

export default router;
