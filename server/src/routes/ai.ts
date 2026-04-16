import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../services/firebase-admin';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { aiChatLimiter, aiRecommendationsLimiter } from '../middleware/security';
import { chatWithContext, generateRecommendations } from '../services/gemini';
import { logError } from '../services/logger';
import type { Zone, Alert } from '../types';

const router = Router();

export const chatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(500, 'Message too long'),
  history: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })).max(10).optional(),
});

/**
 * Helper: fetch all zones from RTDB.
 */
async function getAllZones(): Promise<Zone[]> {
  const snapshot = await db.ref('zones').once('value');
  const data = snapshot.val();
  if (!data) return [];
  return Object.entries(data).map(([id, val]) => ({
    id,
    ...(val as Omit<Zone, 'id'>),
  }));
}

/**
 * Helper: fetch active alerts from RTDB.
 */
async function getActiveAlerts(): Promise<Alert[]> {
  const snapshot = await db.ref('alerts').once('value');
  const data = snapshot.val();
  if (!data) return [];
  return Object.entries(data)
    .map(([id, val]) => ({ id, ...(val as Omit<Alert, 'id'>) }))
    .filter(a => a.status === 'active' || a.status === 'acknowledged');
}

/**
 * POST /api/ai/chat
 * Public — attendee AI chat grounded in live zone data.
 * Rate limited to 20 req/min/IP.
 */
router.post(
  '/chat',
  aiChatLimiter,
  validate(chatSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { message, history } = req.body;
      const zones = await getAllZones();
      const reply = await chatWithContext(message, zones, history);
      res.json({ reply });
    } catch (error) {
      logError('AI chat error', error);
      res.status(500).json({ error: 'Failed to process AI chat request' });
    }
  }
);

/**
 * POST /api/ai/recommendations
 * Staff-only — generate crowd management recommendations.
 * Rate limited to 10 req/min/IP.
 */
router.post(
  '/recommendations',
  aiRecommendationsLimiter,
  requireAuth,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const zones = await getAllZones();
      const alerts = await getActiveAlerts();
      const recommendations = await generateRecommendations(zones, alerts);
      res.json({ recommendations, generatedAt: new Date().toISOString() });
    } catch (error) {
      logError('AI recommendations error', error);
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  }
);

export default router;
