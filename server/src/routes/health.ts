import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/health
 * Cloud Run health check endpoint. Returns 200 if the service is running.
 */
router.get('/', (_req: Request, res: Response): void => {
  res.json({
    status: 'healthy',
    service: 'venueflow-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
