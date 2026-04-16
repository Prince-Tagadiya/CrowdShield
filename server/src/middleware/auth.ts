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
    const decoded = await auth.verifyIdToken(idToken);

    // Check for staff role in custom claims
    const role = (decoded.role as string) ?? 'attendee';
    if (role !== 'staff' && role !== 'admin') {
      res.status(403).json({ error: 'Insufficient permissions. Staff access required.' });
      return;
    }

    req.auth = {
      uid: decoded.uid,
      email: decoded.email ?? '',
      role,
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
