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
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
  getFirestore, collection, addDoc, getDocs,
  query, orderBy, serverTimestamp,
  onSnapshot, doc, updateDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

import { ROLE_MAP } from './data.js';

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
 * Determines system role from a user's email address.
 * @param {string} email - The authenticated user's email
 * @returns {string} - One of: admin, fire, medical, police, attendee
 */
export function identifyUserRole(email) {
  if (!email) return 'attendee';
  const prefix = email.split('@')[0].toLowerCase();
  for (const [key, role] of Object.entries(ROLE_MAP)) {
    if (prefix.startsWith(key)) return role;
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
