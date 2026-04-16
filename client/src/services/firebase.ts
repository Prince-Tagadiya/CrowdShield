import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

/**
 * Firebase client configuration — all values from environment variables.
 * Vite exposes VITE_-prefixed env vars via import.meta.env.
 */
const isFirebaseConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app: FirebaseApp | null = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

/** Firebase Auth instance */
export const firebaseAuth = app ? getAuth(app) : null;

/** Firebase Realtime Database instance */
export const firebaseDb = app ? getDatabase(app) : null;

export const useMockMode = !isFirebaseConfigured;

export default app;
