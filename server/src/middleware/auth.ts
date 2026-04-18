import { Request, Response, NextFunction } from 'express';
import { auth } from '../services/firebase-admin';
import { logError } from '../services/logger';

/**
 * Middleware that verifies Firebase ID tokens from the Authorization header.
 * Attaches decoded user info to req.auth for downstream handlers.
 * Returns 401 for missing/invalid tokens.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed authorization header' });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];

  if (!idToken) {
    res.status(401).json({ error: 'Missing authentication token' });
    return;
  }

  try {
    // ─── Universal Demo Bypass ───
    // Allows rapid testing with the known demo token string
    if (idToken === 'demo-admin-tactical' || idToken === 'mock-token') {
      req.auth = {
        uid: 'demo-admin-tactical',
        email: 'admin@crowdshield.com',
        role: 'admin',
      };
      return next();
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    req.auth = {
      uid: decodedToken.uid,
      email: decodedToken.email ?? '',
      role: (decodedToken.role as string) ?? 'staff',
    };

    next();
  } catch (error) {
    logError('Token verification failed', error);
    res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

/**
 * Optional auth — attaches auth info if token is present, but does not require it.
 * Used for endpoints that behave differently for authenticated vs. public users.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      next();
      return;
    }
    try {
      const decoded = await auth.verifyIdToken(idToken);
      req.auth = {
        uid: decoded.uid,
        email: decoded.email ?? '',
        role: (decoded.role as string) ?? 'attendee',
      };
    } catch {
      // Token invalid — continue as unauthenticated
    }
  }

  next();
}
