import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

/**
 * Firebase client configuration — all values from environment variables.
 * Vite exposes VITE_-prefixed env vars via import.meta.env.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDifc9j2f-Tj6I_ACkhRR6lvGmwiltdtgw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "crowdshield-3912c.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://crowdshield-3912c-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "crowdshield-3912c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "crowdshield-3912c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "864518919258",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:864518919258:web:e5ec5f046b6d49e1c57463",
};

const isFirebaseConfigured = !!firebaseConfig.apiKey;
const app: FirebaseApp | null = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

/** Firebase Auth instance */
export const firebaseAuth = app ? getAuth(app) : null;

/** Firebase Realtime Database instance */
export const firebaseDb = app ? getDatabase(app) : null;

export const useMockMode = !isFirebaseConfigured;

export default app;
