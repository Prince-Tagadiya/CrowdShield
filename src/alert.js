/**
 * alert.js — Alert Routing & Firestore Persistence
 * 
 * Purpose: Manages the lifecycle of alerts — creation, storage in Firestore,
 *          real-time listening, and status updates.
 * 
 * Firestore Collections:
 *   - alerts: { type, location, status, teams, message, timestamp }
 */

import {
  db, collection, addDoc, getDocs, query, orderBy, serverTimestamp,
  onSnapshot, doc, updateDoc
} from './firebase.js';

const ALERTS_COLLECTION = 'alerts';

/**
 * Saves a new alert to Firestore.
 * @param {object} alertData - { type, location, teams, message }
 * @returns {string|null} - Firestore document ID or null on failure
 */
export async function saveAlertToDB(alertData) {
  try {
    const docRef = await addDoc(collection(db, ALERTS_COLLECTION), {
      type:      alertData.type,
      location:  alertData.location,
      status:    'pending',
      teams:     alertData.teams || [],
      message:   alertData.message || '',
      timestamp: serverTimestamp()
    });
    console.log('[Firestore] Alert saved:', docRef.id);
    return docRef.id;
  } catch (err) {
    console.error('[Firestore] Save failed:', err.message);
    return null;
  }
}

/**
 * Fetches all alerts from Firestore, ordered by most recent.
 * @returns {Array} - Array of alert documents
 */
export async function fetchAlerts() {
  try {
    const q = query(collection(db, ALERTS_COLLECTION), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[Firestore] Fetch failed:', err.message);
    return [];
  }
}

/**
 * Subscribes to real-time alert updates from Firestore.
 * @param {function} callback - Called with updated alerts array
 * @returns {function} - Unsubscribe function
 */
export function listenToAlerts(callback) {
  try {
    const q = query(collection(db, ALERTS_COLLECTION), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snap) => {
      const alerts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(alerts);
    });
  } catch (err) {
    console.error('[Firestore] Listener failed:', err.message);
    return () => {}; // Return no-op unsubscribe
  }
}

/**
 * Updates the status of an existing alert in Firestore.
 * @param {string} alertId - Firestore document ID
 * @param {string} newStatus - "approved" | "dispatched" | "resolved"
 * @param {string[]} [assignedTeams] - Optional team override
 */
export async function updateAlertStatus(alertId, newStatus, assignedTeams) {
  try {
    const updates = { status: newStatus };
    if (assignedTeams) updates.assignedTeams = assignedTeams;
    await updateDoc(doc(db, ALERTS_COLLECTION, alertId), updates);
    console.log(`[Firestore] Alert ${alertId} → ${newStatus}`);
  } catch (err) {
    console.error('[Firestore] Update failed:', err.message);
  }
}

/**
 * Routes an alert to the correct teams based on event type.
 * @param {object} alertData - { type, location, teams, response }
 * @returns {object} - Enriched alert with routing metadata
 */
export function routeAlert(alertData) {
  const alert = {
    id: Date.now(),
    type: alertData.intent || alertData.type,
    location: alertData.location,
    teams: alertData.teams || ['police'],
    msg: alertData.response || alertData.message || '',
    status: 'Pending'
  };
  return alert;
}
