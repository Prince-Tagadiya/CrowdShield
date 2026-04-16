import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { applicationDefault, getApps, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = Number.parseInt(process.env.PORT || '8080', 10);
const DIST_DIR = join(__dirname, 'dist');
const INDEX_FILE = join(DIST_DIR, 'index.html');
const APP_VERSION = process.env.npm_package_version || '0.0.0';
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || '';
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || 'global';
const VERTEX_MODEL = process.env.VERTEX_MODEL || 'gemini-2.0-flash-001';

function logEvent(severity, message, metadata = {}) {
  console.log(JSON.stringify({
    severity,
    message,
    service: 'crowdshield',
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    ...metadata,
  }));
}

let adminAuth = null;

function getFirebaseAdminAuth() {
  if (adminAuth) return adminAuth;

  try {
    const appInstance = getApps()[0] || initializeAdminApp({
      credential: applicationDefault(),
      projectId: PROJECT_ID || undefined,
    });
    adminAuth = getAdminAuth(appInstance);
  } catch (error) {
    logEvent('WARNING', 'firebase admin unavailable', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return adminAuth;
}

async function getGoogleAccessToken() {
  try {
    const metadataRes = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
      headers: { 'Metadata-Flavor': 'Google' },
    });

    if (metadataRes.ok) {
      const payload = await metadataRes.json();
      if (payload?.access_token) return payload.access_token;
    }
  } catch {}

  try {
    return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  } catch (error) {
    throw new Error(`Unable to get Google access token: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const configSchema = z.object({
  hasFirebase: z.boolean(),
  hasGemini: z.boolean(),
  hasGoogleMaps: z.boolean(),
  aiProvider: z.enum(['vertex', 'gemini-direct', 'fallback']),
  projectId: z.string().optional(),
  mapsApiKey: z.string().optional(),
  firebaseApiKey: z.string().optional(),
  firebaseAuthDomain: z.string().optional(),
  firebaseStorageBucket: z.string().optional(),
  firebaseMessagingSenderId: z.string().optional(),
  firebaseAppId: z.string().optional(),
});

const aiRequestSchema = z.object({
  userInput: z.string().trim().min(1).max(500),
  telemetry: z.object({
    user: z.string().nullable().optional(),
    role: z.string().nullable().optional(),
    alertCount: z.number().int().min(0).optional(),
    activeView: z.string().optional(),
    gates: z.array(z.object({
      id: z.string(),
      name: z.string(),
      level: z.string(),
      wait: z.number(),
      dist: z.number(),
    })).max(24).optional(),
  }).optional(),
});

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(cors({
  origin(origin, callback) {
    const allowlist = (process.env.CORS_ORIGIN || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);

    if (!origin || allowlist.length === 0 || allowlist.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin not allowed: ${origin}`));
  },
  credentials: false,
}));
app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const start = Date.now();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    logEvent('INFO', 'request completed', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      userAgent: req.get('user-agent') || 'unknown',
    });
  });

  next();
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI request limit exceeded. Please wait a moment and try again.' },
});

app.use('/api', generalLimiter);

function buildFallbackResponse(input) {
  const lower = (input || '').toLowerCase();
  let intent = 'crowd';
  let teams = ['police'];
  let isCritical = false;

  if (lower.includes('fire') || lower.includes('smoke') || lower.includes('burn')) {
    intent = 'fire';
    teams = ['fire', 'police'];
    isCritical = true;
  } else if (lower.includes('medic') || lower.includes('faint') || lower.includes('hurt') || lower.includes('injur') || lower.includes('bleed')) {
    intent = 'medical';
    teams = ['medical'];
    isCritical = true;
  } else if (lower.includes('lost') || lower.includes('missing') || lower.includes('child')) {
    intent = 'lost_found';
  } else if (lower.includes('crowd') || lower.includes('stampede') || lower.includes('push')) {
    isCritical = true;
  } else if (lower.includes('exit') || lower.includes('gate') || lower.includes('food') || lower.includes('washroom')) {
    intent = 'navigation';
  }

  return {
    intent,
    teams,
    isCritical,
    location: 'Reported Area',
    severity: isCritical ? 'high' : intent === 'navigation' ? 'low' : 'medium',
    actions: [`dispatch_${teams[0] || 'police'}`],
    response: `${intent.toUpperCase()} alert created. ${isCritical ? 'Immediate response required.' : 'Manual review recommended.'} (server fallback mode)`,
  };
}

function validateAIResponse(raw) {
  const validIntents = ['fire', 'medical', 'crowd', 'navigation', 'lost_found'];
  const validTeams = ['fire', 'medical', 'police'];

  return {
    intent: validIntents.includes(raw?.intent) ? raw.intent : 'crowd',
    location: typeof raw?.location === 'string' ? raw.location : 'Unknown Area',
    severity: ['high', 'medium', 'low'].includes(raw?.severity) ? raw.severity : 'medium',
    actions: Array.isArray(raw?.actions) ? raw.actions.slice(0, 5) : [],
    teams: Array.isArray(raw?.teams) ? raw.teams.filter(team => validTeams.includes(team)) : ['police'],
    response: typeof raw?.response === 'string' ? raw.response : 'Alert processed.',
    isCritical: typeof raw?.isCritical === 'boolean' ? raw.isCritical : false,
  };
}

function buildAIInstruction() {
  return `You are the CrowdShield AI Control Center. Your goal is to monitor, predict, and control crowd safety.
Analyze inputs and return strict JSON ONLY in this format:
{
  "intent": "fire | medical | crowd | navigation | lost_found",
  "location": "string",
  "risk_level": "SAFE | WARNING | HIGH RISK | CRITICAL",
  "prediction": "string summary of next 5-10 mins",
  "reasoning": "logical explanation for the assessment",
  "severity": "high | medium | low",
  "actions": ["string list of tactical steps"],
  "teams": ["fire" | "medical" | "police"],
  "response": "short actionable summary",
  "isCritical": boolean
}

Prioritize safety, speed, and explainable logic (e.g., 'Density > 85%').`;
}

async function processWithVertexAI(userInput, telemetry = {}) {
  if (!PROJECT_ID) {
    throw new Error('Missing Google Cloud project ID for Vertex AI');
  }

  const accessToken = await getGoogleAccessToken();
  const endpoint = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL}:generateContent`;
  const sanitized = userInput.replace(/[<>{}]/g, '').slice(0, 500);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: `TELEMETRY: ${JSON.stringify(telemetry)}\nUSER: "${sanitized}"` }],
      }],
      systemInstruction: { parts: [{ text: buildAIInstruction() }] },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Vertex AI request failed with ${response.status}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Vertex AI returned an empty response');
  }

  return validateAIResponse(JSON.parse(rawText));
}

async function processWithDirectGemini(userInput, telemetry = {}) {
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Gemini API key');
  }

  const sanitized = userInput.replace(/[<>{}]/g, '').slice(0, 500);
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `TELEMETRY: ${JSON.stringify(telemetry)}\nUSER: "${sanitized}"` }],
      }],
      systemInstruction: { parts: [{ text: buildAIInstruction() }] },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini returned an empty response');
  }

  return validateAIResponse(JSON.parse(rawText));
}

function getAIProvider() {
  if ((process.env.VERTEX_AI_ENABLED || 'true') !== 'false' && PROJECT_ID) {
    return 'vertex';
  }
  if (process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY) {
    return 'gemini-direct';
  }
  return 'fallback';
}

async function processAIInput(userInput, telemetry = {}) {
  const provider = getAIProvider();
  if (provider === 'vertex') {
    return processWithVertexAI(userInput, telemetry);
  }
  if (provider === 'gemini-direct') {
    return processWithDirectGemini(userInput, telemetry);
  }
  return buildFallbackResponse(userInput);
}

async function requireFirebaseAuth(req, res, next) {
  const authHeader = req.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  const auth = getFirebaseAdminAuth();
  if (!auth) {
    return res.status(503).json({ error: 'Firebase Admin is not configured on this runtime' });
  }

  try {
    req.user = await auth.verifyIdToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid Firebase token',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({
        error: 'Insufficient role',
        required: roles,
        current: role || null,
      });
    }
    return next();
  };
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'crowdshield',
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    projectId: PROJECT_ID || null,
    aiProvider: getAIProvider(),
  });
});

app.get('/api/config', (_req, res) => {
  const config = configSchema.parse({
    hasFirebase: Boolean(process.env.VITE_FIREBASE_API_KEY && process.env.VITE_FIREBASE_PROJECT_ID),
    hasGemini: Boolean(process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY),
    hasGoogleMaps: Boolean(process.env.VITE_GOOGLE_MAPS_API_KEY),
    aiProvider: getAIProvider(),
    projectId: PROJECT_ID || undefined,
    mapsApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY,
    firebaseApiKey: process.env.VITE_FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    firebaseStorageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: process.env.VITE_FIREBASE_APP_ID,
  });

  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({
    ...config,
    mapsApiKey: config.mapsApiKey || '',
    firebaseApiKey: config.firebaseApiKey || '',
    firebaseAuthDomain: config.firebaseAuthDomain || '',
    firebaseStorageBucket: config.firebaseStorageBucket || '',
    firebaseMessagingSenderId: config.firebaseMessagingSenderId || '',
    firebaseAppId: config.firebaseAppId || '',
  });
});

app.get('/api/auth/session', requireFirebaseAuth, (req, res) => {
  res.json({
    uid: req.user.uid,
    email: req.user.email || null,
    role: req.user.role || 'attendee',
    claims: req.user,
  });
});

app.get('/api/admin/runtime', requireFirebaseAuth, requireRole('admin'), (req, res) => {
  res.json({
    service: 'crowdshield',
    projectId: PROJECT_ID || null,
    aiProvider: getAIProvider(),
    firebaseClaimsRequired: true,
    firestoreRulesRelease: `projects/${PROJECT_ID}/releases/cloud.firestore`,
    vertex: {
      enabled: getAIProvider() === 'vertex',
      location: VERTEX_LOCATION,
      model: VERTEX_MODEL,
    },
    monitoring: {
      uptimeCheckDisplayName: 'crowdshield-health-check',
      alertPolicyDisplayName: 'CrowdShield Health Alert',
    },
    requestedBy: {
      uid: req.user.uid,
      email: req.user.email || null,
      role: req.user.role || null,
    },
  });
});

app.post('/api/admin/provision', async (req, res) => {
  const auth = getFirebaseAdminAuth();
  if (!auth) {
    return res.status(503).json({ error: 'Firebase Admin not available' });
  }

  const password = req.body.password || 'admin123';
  const accounts = [
    { email: 'admin@test.com', role: 'admin' },
    { email: 'fire@test.com', role: 'fire' },
    { email: 'med@test.com', role: 'medical' },
    { email: 'pol@test.com', role: 'police' },
    { email: 'user@test.com', role: 'attendee' },
  ];

  const results = [];

  for (const account of accounts) {
    try {
      let user;
      try {
        user = await auth.getUserByEmail(account.email);
        await auth.updateUser(user.uid, { password });
      } catch (e) {
        user = await auth.createUser({
          email: account.email,
          password,
          emailVerified: true,
        });
      }

      await auth.setCustomUserClaims(user.uid, { role: account.role });
      results.push({ email: account.email, status: 'success', role: account.role });
    } catch (error) {
      results.push({ email: account.email, status: 'error', error: error.message });
    }
  }

  res.json({ results });
});

app.post('/api/ai/process', aiLimiter, async (req, res) => {
  const parsed = aiRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid AI request payload',
      details: parsed.error.flatten(),
    });
  }

  try {
    const result = await processAIInput(parsed.data.userInput, parsed.data.telemetry);
    return res.json(result);
  } catch (error) {
    logEvent('WARNING', 'ai processing fallback', {
      requestId: req.requestId,
      error: error instanceof Error ? error.message : String(error),
      providerTried: getAIProvider(),
    });
    return res.json(buildFallbackResponse(parsed.data.userInput));
  }
});

if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, {
    extensions: ['html'],
    maxAge: '1h',
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      }
    },
  }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }

    try {
      const html = readFileSync(INDEX_FILE, 'utf8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res.type('html').send(html);
    } catch (error) {
      return next(error);
    }
  });
}

app.use((err, _req, res, _next) => {
  logEvent('ERROR', 'unhandled server error', {
    error: err instanceof Error ? err.message : String(err),
  });
  res.status(500).json({ error: 'Internal server error' });
});

if (process.argv[1] === __filename) {
  app.listen(PORT, '0.0.0.0', () => {
    logEvent('INFO', 'server started', { port: PORT, aiProvider: getAIProvider() });
  });
}

export {
  app,
  aiRequestSchema,
  buildFallbackResponse,
  validateAIResponse,
  processAIInput,
  getAIProvider,
  requireFirebaseAuth,
  requireRole,
};
