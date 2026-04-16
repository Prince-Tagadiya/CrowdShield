import express from 'express';
import path from 'path';
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
  // Use project root relative to the compiled file location
  const projectRoot = path.join(__dirname, '..', '..');
  const clientDistPath = path.join(projectRoot, 'client', 'dist');
  
  logInfo('Production mode: serving static files', { clientDistPath });

  // Serve static files with caching
  app.use(express.static(clientDistPath, {
    maxAge: '1d',
    index: false
  }));

  // SPA fallback — serve index.html for all non-API, non-file routes
  app.get('*', (req: express.Request, res: express.Response) => {
    // If it looks like a file request but wasn't caught by express.static, return a 404
    if (req.path.includes('.')) {
      res.status(404).end();
      return;
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
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
