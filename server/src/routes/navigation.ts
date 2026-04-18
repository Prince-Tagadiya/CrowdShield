import { Router } from 'express';
import { getZones } from '../services/store';
import { findShortestPath } from '../services/pathfinder';
import { logError } from '../services/logger';

const router = Router();

/**
 * GET /api/navigation
 * Query: start, end
 */
router.get('/', (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
     res.status(400).json({ error: 'Missing start or end zone ID' });
     return;
  }

  try {
    const zones = getZones();
    const result = findShortestPath(start as string, end as string, zones);
    res.json(result);
  } catch (error: unknown) {
    logError('Navigation error', error);
    const message = error instanceof Error ? error.message : 'Navigation failure';
    res.status(500).json({ error: message });
  }
});

export default router;
