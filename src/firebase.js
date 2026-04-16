/**
 * firebase.js — Firebase runtime configuration, Auth & Firestore
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

let auth;
let db;
let initPromise = null;

async function loadFirebaseRuntimeConfig() {
  const res = await fetch('/api/config', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Config request failed with ${res.status}`);
  }

  const config = await res.json();
  return {
    apiKey: config.firebaseApiKey,
    authDomain: config.firebaseAuthDomain,
    projectId: config.projectId,
    storageBucket: config.firebaseStorageBucket,
    messagingSenderId: config.firebaseMessagingSenderId,
    appId: config.firebaseAppId,
  };
}

export async function initFirebase() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const firebaseConfig = await loadFirebaseRuntimeConfig();

    if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
      throw new Error('Firebase runtime config is incomplete');
    }

    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    return { auth, db };
  })();

  return initPromise;
}

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

export {
  auth, db,
  signInWithEmailAndPassword, onAuthStateChanged, signOut,
  collection, addDoc, getDocs, query, orderBy, serverTimestamp,
  onSnapshot, doc, updateDoc
};
