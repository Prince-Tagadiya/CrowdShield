/**
 * state.js — Central State Manager
 * 
 * Purpose: Single source of truth for the entire application.
 *          All modules read from and write to this state.
 *          Uses a simple pub/sub pattern for reactive updates.
 */

import { GATES, WORKERS } from './data.js';

// --- APPLICATION STATE --- //
const state = {
  // Auth
  currentUser: null,   // { email, uid }
  role: null,          // 'admin' | 'fire' | 'medical' | 'police' | 'attendee'

  // Data
  alerts: [],          // Live alerts from Firestore
  workers: WORKERS.map(w => ({ ...w })),
  gates: GATES.map(g => ({ ...g })),

  // UI
  activeView: 'login', // 'login' | 'admin' | 'team' | 'attendee'
  pendingReport: null,
  pendingAIAction: null,

  // Firestore listener cleanup
  _unsubscribe: null
};

// --- PUB/SUB SYSTEM --- //
const listeners = new Map();

/**
 * Subscribe to state changes on a specific key.
 * @param {string} key - State property name
 * @param {function} callback - Called with (newValue, key)
 * @returns {function} Unsubscribe function
 */
export function subscribe(key, callback) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(callback);
  return () => listeners.get(key)?.delete(callback);
}

/**
 * Update state and notify subscribers.
 * @param {string} key - State property to update
 * @param {*} value - New value
 */
export function setState(key, value) {
  if (!(key in state)) {
    console.warn(`[State] Unknown key: ${key}`);
    return;
  }
  state[key] = value;
  const subs = listeners.get(key);
  if (subs) subs.forEach(fn => {
    try { fn(value, key); }
    catch (err) { console.error(`[State] Subscriber error on "${key}":`, err); }
  });
}

/**
 * Read current state value.
 * @param {string} key - State property name
 * @returns {*} Current value
 */
export function getState(key) {
  return state[key];
}

/**
 * Reset state to defaults (on logout).
 */
export function resetState() {
  // Clean up Firestore listener
  if (state._unsubscribe) {
    state._unsubscribe();
    state._unsubscribe = null;
  }

  setState('currentUser', null);
  setState('role', null);
  setState('alerts', []);
  setState('workers', WORKERS.map(w => ({ ...w })));
  setState('gates', GATES.map(g => ({ ...g })));
  setState('activeView', 'login');
  setState('pendingReport', null);
  setState('pendingAIAction', null);
}

/**
 * Get a snapshot of the full state (for telemetry/debugging).
 * @returns {object} Read-only copy of state
 */
export function getSnapshot() {
  return {
    user: state.currentUser?.email || null,
    role: state.role,
    alertCount: state.alerts.length,
    activeView: state.activeView,
    gates: state.gates.map(g => ({ ...g })),
  };
}

export default state;
