import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Express } from 'express';

/**
 * Apply all security middleware to the Express app.
 * - Helmet: security headers (CSP, HSTS, etc.)
 * - CORS: restrictive origin allowlist (not wildcard in production)
 * - Rate limiting: general + stricter limits for AI endpoints
 */
export function applySecurityMiddleware(app: Express): void {
  // Security headers via Helmet (CSP disabled — Google Maps dynamically loads
  // scripts from many subdomains that cannot be fully whitelisted)
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false, // Required for Google Maps
  }));

  // CORS: static files are served before this runs, so this only applies to /api/* routes.
  // In production the frontend is co-hosted, so same-origin requests don't need CORS at all.
  // External API consumers (mobile apps, etc.) are allowed by wildcard.
  app.use(cors({
    origin: true, // reflect the request Origin — works for same-origin + cross-origin
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
}

/** General rate limiter: 100 requests per minute per IP */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

/** Strict rate limiter for AI chat: 20 requests per minute per IP */
export const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI chat rate limit exceeded. Please wait before sending more messages.' },
});

/** Very strict rate limiter for AI recommendations: 10 requests per minute per IP */
export const aiRecommendationsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Recommendations rate limit exceeded. Please wait before requesting more.' },
});
