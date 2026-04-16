/**
 * firebase.js — Firebase Configuration, Auth & Firestore
 * 
 * Purpose: Initializes Firebase app, Authentication, and Firestore.
 *          All credentials loaded securely from environment variables.
 * 
 * Security: No API keys are hardcoded. Uses VITE_* env vars via Vite.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, getIdTokenResult
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
  getFirestore, collection, addDoc, getDocs,
  query, orderBy, serverTimestamp,
  onSnapshot, doc, updateDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// --- CONFIGURATION (from environment) --- //
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID
};

// --- INITIALIZATION --- //
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

/**
 * Resolves a user's role from Firebase custom claims when present.
 * @param {import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js').User} user
 * @returns {Promise<string>}
 */
export async function resolveUserRole(user) {
  if (!user) return 'attendee';

  try {
    const token = await getIdTokenResult(user, true);
    if (token?.claims?.role) {
      return String(token.claims.role);
    }
  } catch (error) {
    console.warn('[Auth] Failed to resolve custom claims:', error?.message || error);
  }

  return 'attendee';
}

// --- EXPORTS --- //
export {
  auth, db,
  signInWithEmailAndPassword, onAuthStateChanged, signOut,
  collection, addDoc, getDocs, query, orderBy, serverTimestamp,
  onSnapshot, doc, updateDoc
};
