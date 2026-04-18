import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { logInfo, logError } from './services/logger';

// Only load .env if it exists (local dev); production uses environment variables
const envPath = path.resolve(process.cwd(), '.env');
const parentEnvPath = path.resolve(process.cwd(), '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (fs.existsSync(parentEnvPath)) {
  dotenv.config({ path: parentEnvPath });
}
import { applySecurityMiddleware, generalLimiter } from './middleware/security';
import zoneRoutes from './routes/zones';
import alertRoutes from './routes/alerts';
import aiRoutes from './routes/ai';
import healthRoutes from './routes/health';
import simulateRoutes from './routes/simulate';

import { createServer } from 'http';
import { Server } from 'socket.io';
import { setIo, broadcastZones, broadcastAlerts } from './services/store';

const app = express();
const PORT = parseInt(process.env.PORT ?? '8080', 10);
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
setIo(io);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  // give them initial state
  broadcastZones();
  broadcastAlerts();
  
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

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
    // Dynamic resolution that works both locally (ts-node) and in Docker
    let clientDistPath = path.resolve(process.cwd(), 'client/dist');
    let indexHtml = path.join(clientDistPath, 'index.html');
    
    if (!fs.existsSync(indexHtml)) {
      // Try parent directory if we are running with CWD inside 'server'
      clientDistPath = path.resolve(process.cwd(), '../client/dist');
      indexHtml = path.join(clientDistPath, 'index.html');
    }
    
    // Safety check: ensure we don't start a broken server session
    if (!fs.existsSync(indexHtml)) {
      logError('CRITICAL: Frontend index.html not found. Check build folder.', { path: clientDistPath });
    }

    logInfo('Serving static files from:', { clientDistPath });

    app.use(express.static(clientDistPath, { 
      maxAge: '1h',
      fallthrough: true
    }));

    // SPA fallback — serve index.html for all non-API, non-file routes
    app.get('*', (req, res) => {
      // 1. Never serve index.html for missing assets (prevents MIME type errors)
      if (req.path.includes('.') && !req.path.endsWith('.html')) {
        return res.status(404).type('text/plain').send(`Asset not found: ${req.path}`);
      }
      
      // 2. Only serve index.html if it actually exists
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).type('text/plain').send('Production assets not built. Run npm run build in client folder.');
      }
    });
  } catch (err) {
    logError('Failed to initialize static routes', err);
  }
}

// ─── Global error handler ───
app.use((err: Error, _req: express.Request, res: express.Response, _next: any): void => {
  logError('Unhandled error', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// ─── Start server ───
server.listen(PORT, '0.0.0.0', () => {
  logInfo('CrowdShield server started', {
    port: PORT,
    environment: process.env.NODE_ENV ?? 'development',
    healthCheck: `http://localhost:${PORT}/api/health`,
  });
});

export default app;
