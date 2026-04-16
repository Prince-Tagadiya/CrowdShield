/**
 * alert.js — Alert Routing & Firestore Persistence
 * 
 * Purpose: Manages the lifecycle of alerts — creation, storage in Firestore,
 *          real-time listening, and status updates.
 * 
 * Firestore Collections:
 *   - alerts: { type, location, status, teams, message, severity, timestamp }
 * 
 * Flow:
 *   1. Attendee reports → saveAlertToDB (status: "pending")
 *   2. Admin sees alert → updateAlertStatus (status: "approved")
 *   3. Team dispatches → updateAlertStatus (status: "dispatched")
 *   4. Team resolves → updateAlertStatus (status: "resolved")
 */

import {
  db, collection, addDoc, getDocs, query, orderBy, serverTimestamp,
  onSnapshot, doc, updateDoc
} from './firebase.js';
import { setState } from './state.js';

const ALERTS_COLLECTION = 'alerts';

/**
 * Saves a new alert to Firestore.
 * @param {object} alertData - { type, location, teams, message, severity }
 * @returns {string|null} - Firestore document ID or null on failure
 */
export async function saveAlertToDB(alertData) {
  try {
    const docRef = await addDoc(collection(db, ALERTS_COLLECTION), {
      type:      alertData.type || 'unknown',
      location:  alertData.location || 'Unknown Area',
      status:    'pending',
      teams:     alertData.teams || [],
      message:   alertData.message || '',
      severity:  alertData.severity || 'medium',
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
 * Automatically updates the central state with fresh alerts.
 * @param {function} [callback] - Optional extra callback
 * @returns {function} - Unsubscribe function
 */
export function listenToAlerts(callback) {
  try {
    const q = query(collection(db, ALERTS_COLLECTION), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snap) => {
      const alerts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Update central state — all subscribers will be notified
      setState('alerts', alerts);
      // Optional extra callback
      if (callback) callback(alerts);
    }, (err) => {
      console.error('[Firestore] Listener error:', err.message);
    });
  } catch (err) {
    console.error('[Firestore] Listener setup failed:', err.message);
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
 * @param {object} alertData - { intent/type, location, teams, response/message }
 * @returns {object} - Enriched alert with routing metadata
 */
export function routeAlert(alertData) {
  const type = alertData.intent || alertData.type || 'crowd';

  // Route to correct teams based on type
  let teams = alertData.teams || [];
  if (teams.length === 0) {
    const teamMap = {
      fire:       ['fire', 'police'],
      medical:    ['medical'],
      crowd:      ['police'],
      lost_found: ['police']
    };
    teams = teamMap[type] || ['police'];
  }

  return {
    type,
    location: alertData.location || 'Unknown Area',
    teams,
    message: alertData.response || alertData.message || '',
    severity: alertData.severity || 'medium',
    status: 'pending'
  };
}
