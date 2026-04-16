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

  // CORS configuration
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [process.env.CORS_ORIGIN ?? ''].filter(Boolean)
    : ['http://localhost:5173', 'http://localhost:8080'];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (same-origin, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
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
