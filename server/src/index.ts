import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '../.env') });
import { applySecurityMiddleware, generalLimiter } from './middleware/security';
import zoneRoutes from './routes/zones';
import alertRoutes from './routes/alerts';
import aiRoutes from './routes/ai';
import healthRoutes from './routes/health';
import simulateRoutes from './routes/simulate';
import { logInfo, logError } from './services/logger';

const app = express();
const PORT = parseInt(process.env.PORT ?? '8080', 10);

// Cloud Run sits behind a load balancer — trust proxy headers
app.set('trust proxy', 1);

// ─── Body parsing ───
app.use(express.json({ limit: '1mb' }));

// ─── Security (Helmet, CORS, etc.) ───
applySecurityMiddleware(app);

// ─── General rate limiting ───
app.use('/api/', generalLimiter);

// ─── API Routes ───
app.use('/api/health', healthRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/simulate', simulateRoutes);

// ─── Serve static frontend in production ───
if (process.env.NODE_ENV === 'production') {
  try {
    // Hard-coded absolute path for Docker container stability
    const clientDistPath = '/app/client/dist';
    const indexHtml = path.join(clientDistPath, 'index.html');
    
    // Safety check: ensure we don't start a broken server
    if (!fs.existsSync(indexHtml)) {
      logError('CRITICAL: Frontend index.html not found', { path: indexHtml });
    }

    logInfo('Production mode: serving static files', { clientDistPath });

    app.use(express.static(clientDistPath, { 
      maxAge: '1d',
      fallthrough: true // Let it go to the SPA fallback if not found
    }));

    app.get('*', (req: express.Request, res: express.Response) => {
      // Don't serve index.html for missing asset files (prevents MIME mismatch)
      if (req.path.includes('.') && !req.path.endsWith('.html')) {
        return res.status(404).send('Asset not found');
      }
      res.sendFile(indexHtml);
    });
  } catch (err) {
    logError('Failed to initialize static routes', err);
  }
}

// ─── Global error handler ───
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction): void => {
  logError('Unhandled error', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// ─── Start server ───
app.listen(PORT, '0.0.0.0', () => {
  logInfo('CrowdShield server started', {
    port: PORT,
    environment: process.env.NODE_ENV ?? 'development',
    healthCheck: `http://localhost:${PORT}/api/health`,
  });
});

export default app;
