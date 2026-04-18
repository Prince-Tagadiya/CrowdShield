import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Only load .env if it exists (local dev); production uses environment variables
const envPath = path.resolve(process.cwd(), '.env');
const parentEnvPath = path.resolve(process.cwd(), '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (fs.existsSync(parentEnvPath)) {
  dotenv.config({ path: parentEnvPath });
}

import { logInfo, logError } from './services/logger';
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
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
setIo(io);

io.on('connection', (socket) => {
  logInfo('Socket connected', { id: socket.id });
  broadcastZones();
  broadcastAlerts();
  socket.on('disconnect', () => logInfo('Socket disconnected', { id: socket.id }));
});

// Cloud Run sits behind a load balancer — trust proxy headers
app.set('trust proxy', 1);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Serve static frontend assets FIRST — before CORS/Helmet middleware.
//
// KEY FIX: Vite emits <script type="module" crossorigin> tags which cause the
// browser to add an "Origin" header to every asset request. If these requests
// hit the CORS middleware before the static-file handler, the middleware can
// reject them and Express returns a JSON error body. The browser then sees
// Content-Type: application/json for a .js or .css file and aborts it with a
// MIME-type error — causing a full white screen.
//
// Serving assets FIRST means they are returned with correct MIME types
// (set by Express's built-in serve-static) BEFORE any security logic runs.
// ─────────────────────────────────────────────────────────────────────────────
let clientDistPath: string | null = null;

if (process.env.NODE_ENV === 'production') {
  const candidates = [
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(process.cwd(), '../client/dist'),
    path.resolve(__dirname, '../../client/dist'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      clientDistPath = candidate;
      break;
    }
  }

  if (clientDistPath) {
    logInfo('Serving static files', { clientDistPath });

    // /assets — immutably cached (Vite hashes the filenames)
    app.use('/assets', express.static(path.join(clientDistPath, 'assets'), {
      maxAge: '1y',
      immutable: true,
    }));

    // Everything else (icons, manifest.webmanifest, sw.js, registerSW.js …)
    app.use(express.static(clientDistPath, {
      maxAge: '1h',
      index: false, // SPA fallback handled below
    }));
  } else {
    logError('client/dist not found', { tried: candidates });
  }
}

// ─── Body parsing ───
app.use(express.json({ limit: '1mb' }));

// ─── Security (Helmet + CORS) — only reached by API calls now ───
applySecurityMiddleware(app);

// ─── Rate limiting ───
app.use('/api/', generalLimiter);

// ─── API Routes ───
app.use('/api/health', healthRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/simulate', simulateRoutes);

// ─── SPA Fallback (must be after all API routes) ───
if (process.env.NODE_ENV === 'production' && clientDistPath) {
  const indexHtml = path.join(clientDistPath, 'index.html');
  app.get('*', (req, res) => {
    const ext = path.extname(req.path);
    // Don't serve index.html for missing static assets — 404 cleanly
    if (ext && ext !== '.html') {
      return res.status(404).type('text/plain').send(`Asset not found: ${req.path}`);
    }
    res.sendFile(indexHtml);
  });
}

// ─── Global error handler ───
app.use((err: Error, _req: express.Request, res: express.Response, _next: any): void => {
  logError('Unhandled error', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── Start server ───
server.listen(PORT, '0.0.0.0', () => {
  logInfo('CrowdShield server started', {
    port: PORT,
    env: process.env.NODE_ENV ?? 'development',
    health: `http://localhost:${PORT}/api/health`,
    static: clientDistPath ?? 'disabled (dev mode)',
  });

  // ─── Automated Simulation Engine ───
  // Shifts zone occupancies every 10 seconds to make the demo feel "alive"
  // during judging or presentation without requiring manual clicks.
  setInterval(async () => {
    try {
      const response = await fetch(`http://localhost:${PORT}/api/simulate/tick`, { method: 'POST' });
      if (response.ok) {
        logDebug('Automated simulation tick completed');
      }
    } catch (error) {
      // Quietly fail if the server is still booting or shutting down
    }
  }, 10000);
});

export default app;
