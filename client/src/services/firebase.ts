import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

/**
 * Firebase client configuration — all values from environment variables.
 * Vite exposes VITE_-prefixed env vars via import.meta.env.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isFirebaseConfigured = !!firebaseConfig.apiKey;

// Log configuration status for debugging (without leaking full keys)
if (isFirebaseConfigured) {
  console.log('✅ Firebase initialized with API Key:', `${firebaseConfig.apiKey?.substring(0, 6)}...`);
} else {
  console.warn('⚠️ Firebase configuration missing! Check your .env file.');
}

const app: FirebaseApp = initializeApp(firebaseConfig);

/** Firebase Auth instance */
export const firebaseAuth = getAuth(app);

/** Firebase Realtime Database instance */
export const firebaseDb = getDatabase(app);

// Always false to force real auth pipelines as requested by user
export const useMockMode = false;

export default app;
