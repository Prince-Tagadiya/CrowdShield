// firebase.js - Modular Firebase Auth
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ROLE_MAP } from './data.js';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Maps an authenticated email to a system role.
 */
export const identifyUserRole = (email) => {
  if (!email) return 'attendee';
  const prefix = email.split('@')[0].toLowerCase();
  // Match prefix or default to attendee
  for (const [key, role] of Object.entries(ROLE_MAP)) {
    if (prefix.startsWith(key)) return role;
  }
  return 'attendee';
};

export { 
  auth, db, 
  signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword,
  collection, addDoc, getDocs, query, orderBy, serverTimestamp
};
