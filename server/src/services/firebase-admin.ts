import * as admin from 'firebase-admin';
import { logInfo, logWarning } from './logger';

/**
 * Firebase Admin initialization.
 * Automatically detects environment (Cloud Run vs. Local) and initializes
 * with the appropriate credentials.
 */

const base64SA = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
const dbURL = process.env.FIREBASE_DATABASE_URL;

function initializeFirebase(): admin.app.App {
  // If we have a base64 service account (e.g. from GitHub Secrets or .env), use it
  if (base64SA) {
    try {
      const serviceAccount = JSON.parse(Buffer.from(base64SA, 'base64').toString('utf-8'));
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: dbURL,
      });
    } catch (err) {
      logWarning('Failed to parse service account from base64, falling back to default.');
    }
  }

  // Fallback: use application default credentials (works in Cloud Run)
  try {
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: dbURL,
    });
  } catch (err) {
    // Last resort for local dev without any keys: mock initialization
    logWarning('Running with MOCKED Firebase Admin — persistence disabled.');
    return {
      database: () => ({
        ref: () => ({
          on: () => {},
          once: () => Promise.resolve({ val: () => ({}) }),
          update: () => Promise.resolve(),
          set: () => Promise.resolve(),
        }),
      }),
      auth: () => ({
        verifyIdToken: (token: string) => {
          if (token === 'mock-token') {
            return Promise.resolve({ uid: 'mock-staff-uid', email: 'admin@crowdshield.com', role: 'admin' });
          }
          throw new Error('Invalid token');
        },
      }),
    } as any;
  }
}

const app = initializeFirebase();

export const auth = app.auth();
export const db = app.database();
export default app;

