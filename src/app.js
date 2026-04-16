/**
 * app.js — Main Application Controller
 * 
 * Architecture:
 *   state.js     → Central state manager (pub/sub)
 *   data.js      → Constants & simulation data
 *   decision.js  → Scoring & routing logic
 *   ai.js        → Gemini API integration
 *   alert.js     → Firestore persistence & real-time sync
 *   firebase.js  → Auth & database config
 *   tests.js     → Automated validation
 * 
 * Flow:
 *   1. Attendee reports issue → AI processes → saved to Firestore (pending)
 *   2. Admin sees alert via onSnapshot → clicks Execute → status: approved
 *   3. Alert routes to correct teams (fire→fire+police, medical→medical, crowd→police)
 *   4. Teams see relevant alerts → Dispatch / Resolve
 *   5. Attendees see emergency banner for critical alerts
 */

import { initFirebase, auth, signInWithEmailAndPassword, onAuthStateChanged, signOut, resolveUserRole } from './firebase.js';
import { GATES, WORKERS, TEAM_ROLES, EVENT_TYPES } from './data.js';
import { getBestGate, getBestExit, getBestFood, getBestWashroom } from './decision.js';
import { processAIInput } from './ai.js';
import { routeAlert, saveAlertToDB, updateAlertStatus, listenToAlerts } from './alert.js';
import { renderVenueMap } from './maps.js';
import { getState, setState, subscribe, resetState, getSnapshot } from './state.js';
import { runAllTests } from './tests.js';

// --- DOM CACHE --- //
const DOM = {};
let appConfig = { hasGoogleMaps: false, mapsApiKey: '' };
let previousFocusedElement = null;

// ========== INITIALIZATION ========== //

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initFirebase();
    cacheDOMElements();
    setupEventListeners();
    setupStateSubscribers();
    setupAuthObserver();
    await loadRuntimeConfig();
    runAllTests();
  } catch (error) {
    console.error('[Bootstrap]', error);
    document.body.innerHTML = '<main style="padding:24px;font-family:system-ui,sans-serif;color:#fff;background:#08131f;min-height:100vh"><h1>CrowdShield failed to start</h1><p>Firebase runtime configuration could not be loaded.</p></main>';
  }
});

/**
 * Caches references to frequently used DOM elements.
 */
function cacheDOMElements() {
  const ids = [
    'login-form', 'email', 'password', 'login-btn', 'login-error',
    'app-nav', 'user-email', 'role-badge', 'logout-btn', 'view-title',
    'login-screen', 'dashboard-container',
    'view-admin', 'view-team', 'view-attendee',
    'gate-stats', 'stadium-map', 'ai-command-input', 'ai-response-log',
    'ai-submit-btn', 'trigger-event-btn',
    'active-alerts-overlay',
    'active-count-badge', 'avg-response-badge',
    'active-alert-widget', 'team-alerts', 'team-title',
    'emergency-banner', 'attendee-result',
    'insight-best-gate', 'insight-best-exit', 'insight-alert-count',
    'report-input', 'report-submit-btn', 'report-feedback',
    'confirm-modal', 'modal-title', 'modal-desc',
    'modal-confirm', 'modal-cancel',
    'btn-zoom-in', 'btn-zoom-out', 'stadium-root',
    'app-loader', 'attendee-map', 'map-status',
    'admin-google-map', 'admin-map-status'
  ];
  ids.forEach(id => { DOM[id] = document.getElementById(id); });
}

async function loadRuntimeConfig() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error(`Config request failed with ${res.status}`);
    appConfig = await res.json();
  } catch (error) {
    console.warn('[Config]', error instanceof Error ? error.message : error);
  }
}

/** Toggles the global cinematic loader */
function toggleLoader(show) {
  if (show) {
    DOM['app-loader']?.classList.remove('hidden');
  } else {
    // Smooth reveal
    setTimeout(() => {
      DOM['app-loader']?.classList.add('hidden');
    }, 400);
  }
}

// ========== STATE SUBSCRIPTIONS ========== //

/**
 * Sets up reactive state subscribers.
 * When state changes, UI updates automatically.
 */
function setupStateSubscribers() {
  // When alerts change, re-render the relevant views
  subscribe('alerts', (alerts) => {
    const role = getState('role');
    if (role === TEAM_ROLES.ADMIN) renderAdminAlerts(alerts);
    if ([TEAM_ROLES.FIRE, TEAM_ROLES.MEDICAL, TEAM_ROLES.POLICE].includes(role)) renderTeamAlerts(alerts);
    if (role === TEAM_ROLES.ATTENDEE) {
      updateAttendeeBanner(alerts);
      updateAttendeeInsights();
    }
  });

  // When gates change, update stats
  subscribe('gates', () => {
    if (getState('role') === TEAM_ROLES.ADMIN) updateGateStats();
    if (getState('role') === TEAM_ROLES.ADMIN) syncVenueMap('admin');
    if (getState('role') === TEAM_ROLES.ATTENDEE) {
      syncVenueMap('attendee');
      updateAttendeeInsights();
    }
  });
}

// ========== AUTHENTICATION ========== //

function setupAuthObserver() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      setState('currentUser', { email: user.email, uid: user.uid });
      setState('role', await resolveUserRole(user));
      renderDashboard();
    } else {
      if (getState('currentUser')) {
        resetState();
      }
      showView('login');
      DOM['email']?.focus();
    }
  });
}

/**
 * Binds all interactive event listeners. Called once.
 */
function setupEventListeners() {
  // Auth
  DOM['login-form']?.addEventListener('submit', handleLogin);
  DOM['logout-btn']?.addEventListener('click', handleLogout);

  // Admin
  DOM['trigger-event-btn']?.addEventListener('click', triggerRandomSimulation);
  DOM['ai-submit-btn']?.addEventListener('click', () => handleAICommand('admin'));

  // Attendee
  DOM['report-submit-btn']?.addEventListener('click', () => handleAICommand('attendee'));

  // Attendee quick-guide buttons
  document.getElementById('btn-guide-food')?.addEventListener('click', () => provideGuidance('food'));
  document.getElementById('btn-guide-exit')?.addEventListener('click', () => provideGuidance('exit'));
  document.getElementById('btn-guide-washroom')?.addEventListener('click', () => provideGuidance('washroom'));
  document.getElementById('btn-guide-gate')?.addEventListener('click', () => provideGuidance('gate'));

  // Modal
  DOM['modal-confirm']?.addEventListener('click', executePendingAction);
  DOM['modal-cancel']?.addEventListener('click', closeConfirmModal);

  // Zoom controls
  DOM['btn-zoom-in']?.addEventListener('click', () => DOM['stadium-root']?.classList.add('zoomed'));
  DOM['btn-zoom-out']?.addEventListener('click', () => DOM['stadium-root']?.classList.remove('zoomed'));

  // Click stadium pitch to zoom
  document.querySelector('.stadium-pitch')?.addEventListener('click', () => {
    DOM['stadium-root']?.classList.toggle('zoomed');
  });

  // Allow Enter key to submit attendee report
  DOM['report-input']?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAICommand('attendee');
  });
}

/**
 * Handles login form submission.
 */
async function handleLogin(e) {
  e.preventDefault();
  const email = DOM['email'].value.trim().toLowerCase();
  const pass  = DOM['password'].value;
  const btn   = DOM['login-btn'];
  const err   = DOM['login-error'];

  if (!email.includes('@')) {
    showError(err, 'Please enter a valid email (e.g. admin@test.com)');
    return;
  }

  hideError(err);
  btn.disabled = true;
  toggleLoader(true);

  // Real Firebase Auth
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (error) {
    btn.disabled = false;
    btn.textContent = 'Secure Login';
    showError(err, 'Login failed. Use a valid Firebase account for your assigned role.');
    console.error('[Auth]', error.message);
  }
}

/** Logs user out */
function handleLogout() {
  if (window._simInterval) clearInterval(window._simInterval);
  signOut(auth).catch((error) => {
    console.warn('[Auth] Sign-out failed:', error?.message || error);
  });
  resetState();
  showView('login');
}

// ========== VIEW MANAGEMENT ========== //

/**
 * Shows the specified view and hides all others.
 * @param {string} view - 'login' | 'admin' | 'team' | 'attendee'
 */
function showView(view) {
  // Hide everything first
  DOM['login-screen']?.classList.add('hidden');
  DOM['dashboard-container']?.classList.add('hidden');
  DOM['view-admin']?.classList.add('hidden');
  DOM['view-team']?.classList.add('hidden');
  DOM['view-attendee']?.classList.add('hidden');
  DOM['app-nav']?.classList.add('hidden');
  document.body.classList.remove('light-mode');

  if (view === 'login') {
    DOM['login-screen']?.classList.remove('hidden');
    setState('activeView', 'login');
    return;
  }

  // Show nav and dashboard container
  DOM['app-nav']?.classList.remove('hidden');
  DOM['dashboard-container']?.classList.remove('hidden');

  const user = getState('currentUser');
  const role = getState('role');
  if (DOM['user-email'] && user) DOM['user-email'].textContent = user.email;
  if (DOM['role-badge'] && role) DOM['role-badge'].textContent = role.toUpperCase();

  // Show the correct view
  const viewMap = { admin: 'view-admin', team: 'view-team', attendee: 'view-attendee' };
  const targetId = viewMap[view];
  if (targetId) document.getElementById(targetId)?.classList.remove('hidden');

  // Role-specific title
  const titles = { admin: 'Command Center', fire: 'Fire Ops', medical: 'Medical Ops', police: 'Police Ops', attendee: 'Stadium Guide' };
  if (DOM['view-title']) DOM['view-title'].textContent = `• ${titles[role] || ''}`;

  if (view === 'attendee') document.body.classList.add('light-mode');
  if (view === 'admin') DOM['ai-command-input']?.focus();
  if (view === 'team') DOM['team-alerts']?.setAttribute('tabindex', '-1');
  if (view === 'team') DOM['team-alerts']?.focus();
  if (view === 'attendee') document.getElementById('btn-guide-food')?.focus();
  setState('activeView', view);
  toggleLoader(false);
}

/**
 * Routes user to the correct dashboard based on role.
 * Also starts Firestore listeners.
 */
function renderDashboard() {
  const role = getState('role');

  // Start real-time Firestore listener for all logged-in users
  startFirestoreListener();

  if (role === TEAM_ROLES.ADMIN) {
    showView('admin');
    initAdminMap();
    startSimulationLoop();
  } else if ([TEAM_ROLES.FIRE, TEAM_ROLES.MEDICAL, TEAM_ROLES.POLICE].includes(role)) {
    showView('team');
    if (DOM['team-title']) DOM['team-title'].textContent = `${role.charAt(0).toUpperCase() + role.slice(1)} Operations Center`;
  } else {
    showView('attendee');
    initAttendeeMap();
    updateAttendeeInsights();
  }
}

/**
 * Starts the Firestore real-time listener.
 * The listener updates state.alerts, which triggers UI re-renders via subscribers.
 */
function startFirestoreListener() {
  // Clean up previous listener
  const prev = getState('_unsubscribe');
  if (prev) prev();

  try {
    const unsub = listenToAlerts();
    setState('_unsubscribe', unsub);
    console.log('[App] Firestore real-time listener active');
  } catch (err) {
    console.warn('[App] Firestore listener failed, working in offline mode:', err.message);
  }
}

// ========== AI COMMAND & REPORTING ========== //

/**
 * Processes an AI command from either Admin console or Attendee report.
 * @param {string} source - 'admin' or 'attendee'
 */
async function handleAICommand(source) {
  const inputEl = source === 'admin' ? DOM['ai-command-input'] : DOM['report-input'];
  const command = inputEl?.value?.trim();
  if (!command) return;

  // UI feedback — show processing state
  if (source === 'attendee') {
    setFeedback(DOM['report-feedback'], '⏳ Processing with CrowdShield AI...', true);
    DOM['report-input']?.setAttribute('aria-busy', 'true');
    if (DOM['report-submit-btn']) DOM['report-submit-btn'].disabled = true;
  } else {
    if (DOM['ai-response-log']) DOM['ai-response-log'].innerHTML = '<span class="ai-processing">⏳ AI analyzing input...</span>';
    if (DOM['ai-submit-btn']) DOM['ai-submit-btn'].disabled = true;
  }

  try {
    // Send to Gemini with current telemetry
    const telemetry = getSnapshot();
    const result = await processAIInput(command, telemetry);
    inputEl.value = '';

    if (source === 'attendee') {
      // Save to Firestore directly (attendee reports are auto-submitted)
      const routed = routeAlert(result);
      await saveAlertToDB({
        type: routed.type,
        location: routed.location,
        teams: routed.teams,
        message: routed.message,
        severity: routed.severity
      });

      setFeedback(DOM['report-feedback'], '✅ Report sent to Command Center. Stay safe!', true);
      setTimeout(() => setFeedback(DOM['report-feedback'], '', false), 5000);
    } else {
      // Admin: show AI analysis, then confirm critical or auto-execute
      renderAIResponse(result);

      if (result.isCritical) {
        showConfirmModal(result);
      } else {
        await executeAction(result);
      }
    }
  } catch (err) {
    console.error('[App] AI command failed:', err);
    if (source === 'attendee') {
      setFeedback(DOM['report-feedback'], '⚠️ Something went wrong. Please try again.', true);
    } else {
      if (DOM['ai-response-log']) DOM['ai-response-log'].innerHTML = '<span class="ai-error">⚠️ Something went wrong. Please try again.</span>';
    }
  } finally {
    if (source === 'attendee') {
      DOM['report-input']?.setAttribute('aria-busy', 'false');
    }
    // Re-enable buttons
    if (DOM['report-submit-btn']) DOM['report-submit-btn'].disabled = false;
    if (DOM['ai-submit-btn']) DOM['ai-submit-btn'].disabled = false;
  }
}

/**
 * Renders AI analysis in the admin console log.
 */
function renderAIResponse(result) {
  if (!DOM['ai-response-log']) return;
  const severity = result.severity === 'high' ? '🔴' : result.severity === 'medium' ? '🟡' : '🟢';
  DOM['ai-response-log'].innerHTML = `
    <div class="ai-result">
      <div class="ai-result-header">
        <strong>[AI Analysis]</strong> ${severity} ${result.intent?.toUpperCase()}
      </div>
      <div class="ai-result-body">
        <span>📍 ${result.location}</span>
        <span>👥 Teams: ${result.teams?.join(', ')}</span>
      </div>
      <div class="ai-result-msg">${result.response}</div>
    </div>`;
}

// ========== GOVERNANCE (CONFIRMATION MODAL) ========== //

function showConfirmModal(action) {
  setState('pendingAIAction', action);
  previousFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (DOM['modal-title']) DOM['modal-title'].textContent = `🚨 Confirm: ${(action.intent || 'ALERT').toUpperCase()}`;
  if (DOM['modal-desc'])  DOM['modal-desc'].textContent = action.response;
  DOM['confirm-modal']?.showModal();
  DOM['modal-confirm']?.focus();
}

function closeConfirmModal() {
  DOM['confirm-modal']?.close();
  setState('pendingAIAction', null);
  previousFocusedElement?.focus?.();
  previousFocusedElement = null;
}

async function executePendingAction() {
  const pending = getState('pendingAIAction');
  if (pending) {
    await executeAction(pending);
    closeConfirmModal();
  }
}

/**
 * Finalizes an action: saves alert to Firestore.
 * The Firestore listener will automatically update the UI.
 */
async function executeAction(action) {
  try {
    const routed = routeAlert(action);
    const docId = await saveAlertToDB({
      type: routed.type,
      location: routed.location,
      teams: routed.teams,
      message: routed.message,
      severity: routed.severity
    });

    if (docId) {
      console.log(`[App] Alert created: ${docId} → ${routed.type} at ${routed.location}`);
      // Status will be updated via the Firestore listener automatically
    }
  } catch (err) {
    console.error('[App] Execute action failed:', err);
  }
}

// ========== ADMIN: MAP & SIMULATION ========== //

function initAdminMap() {
  const map = DOM['stadium-map'];
  if (!map) return;
  map.innerHTML = '';

  const gates = getState('gates');
  // Dynamic placement around the stadium oval
  const gateAngles = [180, 270, 0, 90]; 
  gates.forEach((gate, i) => {
    const el = document.createElement('div');
    el.className = 'gate-3d';
    el.innerText = gate.name;
    const angle = (gateAngles[i] || 0) * (Math.PI / 180);
    el.style.left = `${50 + 44 * Math.cos(angle)}%`;
    el.style.top  = `${50 + 44 * Math.sin(angle)}%`;
    map.appendChild(el);
  });

  const workers = getState('workers');
  workers.forEach(worker => {
    const dot = document.createElement('div');
    dot.id = `worker-${worker.id}`;
    dot.className = 'worker-3d';
    dot.style.color = `var(--${worker.role}, #fff)`;
    dot.style.left = `${worker.x}%`;
    dot.style.top  = `${worker.y}%`;
    
    // UI Task: Show team on hover
    dot.setAttribute('title', `Unit: ${worker.role.toUpperCase()} - ${worker.name}`);
    
    // UI Task: Zoom on click
    dot.style.cursor = 'pointer';
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      DOM['stadium-root']?.classList.toggle('zoomed');
    });

    map.appendChild(dot);
  });

  updateGateStats();
  syncVenueMap('admin');
}

async function initAttendeeMap() {
  if (!DOM['attendee-map']) return;
  await syncVenueMap('attendee');
}

async function syncVenueMap(mode) {
  if (!appConfig?.hasGoogleMaps || !appConfig?.mapsApiKey) {
    if (mode === 'attendee' && DOM['map-status']) {
      DOM['map-status'].textContent = 'Live venue map unavailable. Add Google Maps API key to enable it.';
      DOM['attendee-map']?.setAttribute('aria-busy', 'false');
    }
    return;
  }

  const container = mode === 'attendee' ? DOM['attendee-map'] : DOM['stadium-map'];
  const statusEl = mode === 'attendee' ? DOM['map-status'] : DOM['admin-map-status'];
  const targetContainer = mode === 'attendee' ? DOM['attendee-map'] : DOM['admin-google-map'];
  if (!targetContainer) return;

  if (!container) return;

  const map = await renderVenueMap({
    container: targetContainer,
    apiKey: appConfig.mapsApiKey,
    gates: getState('gates'),
    mode,
  });

  if (statusEl) {
    statusEl.textContent = map?.mode === 'interactive'
      ? 'Live satellite venue map loaded.'
      : 'Showing Google Maps fallback view. Restrict the API key for production before launch.';
  }

  targetContainer.setAttribute('aria-busy', 'false');
}

/** Simulation loop: moves workers and fluctuates crowd levels (3s interval) */
function startSimulationLoop() {
  if (window._simInterval) clearInterval(window._simInterval);

  window._simInterval = setInterval(() => {
    if (getState('role') !== TEAM_ROLES.ADMIN) return;

    // Move workers
    const workers = getState('workers');
    workers.forEach(worker => {
      // Mission speed boost
      const delta = worker.onMission ? 6 : 4;
      worker.x = Math.max(15, Math.min(85, worker.x + (Math.random() - 0.5) * delta));
      worker.y = Math.max(15, Math.min(85, worker.y + (Math.random() - 0.5) * delta));
      
      const dot = document.getElementById(`worker-${worker.id}`);
      if (dot) { 
        dot.style.left = `${worker.x}%`; 
        dot.style.top = `${worker.y}%`;
        
        // Show glowing mission state
        if (worker.onMission) {
          dot.style.boxShadow = `0 0 15px 5px var(--${worker.role}, #3b82f6)`;
          dot.style.border = '2px solid white';
        } else {
          dot.style.boxShadow = 'none';
          dot.style.border = 'none';
        }
      }
    });

    // Fluctuate gate crowd levels
    const gates = getState('gates');
    gates.forEach(gate => {
      gate.wait  = Math.max(1, Math.min(40, gate.wait + (Math.random() > 0.5 ? 1 : -1)));
      gate.level = gate.wait > 20 ? 'high' : (gate.wait > 10 ? 'med' : 'low');
    });

    setState('gates', gates);
    updateGateStats();
    syncVenueMap('admin');
    if (getState('role') === TEAM_ROLES.ATTENDEE) {
      syncVenueMap('attendee');
    }

    // Update gate visuals on map
    const map = DOM['stadium-map'];
    if (map) {
      const gateEls = map.querySelectorAll('.gate-3d');
      gateEls.forEach((el, i) => {
        if (gates[i]) {
          // Sync 3D label content
          el.textContent = gates[i].name;
        }
      });
    }
  }, 3000);
}

// ========== UI RENDER FUNCTIONS ========== //

/** Updates the gate statistics sidebar */
function updateGateStats() {
  const el = DOM['gate-stats'];
  if (!el) return;
  const gates = getState('gates');
  el.innerHTML = gates.map(gate => {
    const colorClass = gate.level === 'high' ? 'stat-high' : (gate.level === 'med' ? 'stat-med' : 'stat-low');
    const pct = Math.min(100, gate.wait * 2.5);
    return `<div class="gate-stat">
      <div class="gate-header">
        <span>${gate.name}</span>
        <span>${gate.wait}m</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill ${colorClass}" style="width:${pct}%"></div>
      </div>
    </div>`;
  }).join('');
}

/**
 * Renders alert list in the admin dashboard.
 * Shows alerts from Firestore with approve/dismiss actions.
 */
function renderAdminAlerts(alerts) {
  const container = DOM['active-alerts-overlay'];
  if (!container) return;

  if (!alerts || alerts.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted)"><p>No active incidents</p></div>';
    return;
  }

  // Sort: Pending first, then by timestamp desc
  const sorted = [...alerts].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return 0; // Maintain Firestore order otherwise
  });

  container.innerHTML = sorted.slice(0, 30).map(alert => {
    const isCritical = alert.severity === 'high' || alert.isCritical;
    const typeIcon = EVENT_TYPES[alert.type]?.icon || '📋';
    
    let actionButtons = '';
    if (alert.status === 'pending') {
      actionButtons = `<div class="alert-actions">
        <button class="btn-sm btn-approve" onclick="window.app.approveAlert('${alert.id}')">Approve</button>
        <button class="btn-sm btn-dismiss" onclick="window.app.dismissAlert('${alert.id}')">Dismiss</button>
      </div>`;
    }

    return `<article class="alert-card ${alert.status} ${isCritical ? 'critical' : ''}">
      <div class="alert-role">${(alert.teams || []).join(' & ') || 'Operations'}</div>
      <div class="alert-msg">${typeIcon} ${alert.message || 'Incident Reported'}</div>
      <div class="alert-loc">📍 ${alert.location || 'Unknown Area'} • ${alert.status.toUpperCase()}</div>
      ${actionButtons}
    </article>`;
  }).join('');
}

/**
 * Renders alerts visible to the current team role.
 * Only shows alerts that are assigned to their team.
 */
function renderTeamAlerts(alerts) {
  const container = DOM['team-alerts'];
  if (!container) return;
  const role = getState('role');

  // Filter alerts for this team
  const teamAlerts = (alerts || []).filter(a =>
    (a.teams && a.teams.includes(role)) &&
    (a.status === 'approved' || a.status === 'dispatched' || a.status === 'pending')
  );

  if (teamAlerts.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="empty-icon">✅</span><p>All clear. No priority alerts for your unit.</p></div>';
    return;
  }

  container.innerHTML = teamAlerts.slice(0, 15).map(a => {
    const typeIcon = EVENT_TYPES[a.type]?.icon || '📋';
    
    let actions = '';
    if (a.status === 'approved' || a.status === 'pending') {
      actions = `<div class="team-actions">
        <button class="btn-tactical btn-dispatch" onclick="window.app.teamAction('${a.id}','dispatched')">🚀 Dispatch</button>
        <button class="btn-tactical btn-resolve" onclick="window.app.teamAction('${a.id}','resolved')">✅ Mark Resolved</button>
      </div>`;
    } else if (a.status === 'dispatched') {
      actions = `<div class="team-actions">
        <button class="btn-tactical btn-resolve" onclick="window.app.teamAction('${a.id}','resolved')">✅ Mark Resolved</button>
      </div>`;
    }

    return `<article class="team-alert-card">
      <div class="card-header">
        <span class="card-title">${typeIcon} ${a.type?.toUpperCase()} ALERT</span>
        <span class="status-badge status-${a.status}">${a.status?.toUpperCase()}</span>
      </div>
      <span class="card-loc">📍 ${a.location || 'Reported Area'}</span>
      <p class="card-msg">${a.message || 'Immediate response required.'}</p>
      ${actions}
    </article>`;
  }).join('');
}

/**
 * Provides instant guidance to attendees using decision engine.
 * Each button returns distinct, relevant results.
 * @param {string} type - food | exit | washroom | gate
 */
function provideGuidance(type) {
  const el = DOM['attendee-result'];
  if (!el) return;

  let best, label, icon;
  try {
    switch (type) {
      case 'food':
        best = getBestFood();
        label = 'Food Stall'; icon = '🍔';
        break;
      case 'exit':
        best = getBestExit();
        label = 'Exit'; icon = '🏃';
        break;
      case 'washroom':
        best = getBestWashroom();
        label = 'Washroom'; icon = '🚻';
        break;
      case 'gate':
        best = getBestGate(getState('gates'));
        label = 'Gate'; icon = '🚪';
        break;
      default:
        best = getBestGate(getState('gates'));
        label = 'Option'; icon = '📍';
    }
  } catch (err) {
    console.error('[App] Guidance error:', err);
    el.classList.remove('hidden');
    el.innerHTML = '<strong>⚠️ Something went wrong.</strong> Please try again.';
    return;
  }

  if (!best) {
    el.classList.remove('hidden');
    el.innerHTML = `<strong>No ${label.toLowerCase()} data available right now.</strong>`;
    return;
  }

  const crowdLabel = best.level === 'high' ? '🔴 Busy' : best.level === 'med' ? '🟡 Moderate' : '🟢 Clear';

  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="guidance-result">
      <div class="guidance-icon">${icon}</div>
      <div class="guidance-info">
        <strong>Best ${label}: ${best.name}</strong>
        <div class="guidance-meta">
          <span>⏱ ${best.wait} min wait</span>
          <span>📏 ${best.dist}m away</span>
          <span>${crowdLabel}</span>
        </div>
      </div>
    </div>`;
}

/**
 * Shows/hides the emergency banner in attendee mode.
 * Triggered by critical alerts in Firestore.
 */
function updateAttendeeBanner(alerts) {
  const banner = DOM['emergency-banner'];
  if (!banner) return;

  // Find any active critical alert
  const critical = (alerts || []).find(a =>
    ['fire', 'crowd', 'medical'].includes(a.type) &&
    a.severity === 'high' &&
    a.status !== 'resolved'
  );

  if (critical) {
    const icon = EVENT_TYPES[critical.type]?.icon || '🚨';
    banner.classList.remove('hidden');
    banner.innerHTML = `${icon} <strong>EMERGENCY:</strong> ${critical.type.toUpperCase()} reported at ${critical.location}. Follow staff instructions.`;
  } else {
    banner.classList.add('hidden');
  }
}

function updateAttendeeInsights() {
  const bestGate = getBestGate(getState('gates'));
  const bestExit = getBestExit();
  const activeAlerts = (getState('alerts') || []).filter(alert => alert.status !== 'resolved');

  if (DOM['insight-best-gate']) {
    DOM['insight-best-gate'].textContent = bestGate ? `${bestGate.name} • ${bestGate.wait} min` : 'Unavailable';
  }

  if (DOM['insight-best-exit']) {
    DOM['insight-best-exit'].textContent = bestExit ? `${bestExit.name} • ${bestExit.wait} min` : 'Unavailable';
  }

  if (DOM['insight-alert-count']) {
    DOM['insight-alert-count'].textContent = String(activeAlerts.length);
  }
}

// ========== UTILITY HELPERS ========== //

function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  DOM['email']?.setAttribute('aria-invalid', 'true');
  DOM['password']?.setAttribute('aria-invalid', 'true');
}

function hideError(el) {
  if (el) el.style.display = 'none';
  DOM['email']?.setAttribute('aria-invalid', 'false');
  DOM['password']?.setAttribute('aria-invalid', 'false');
}
function setFeedback(el, msg, show) {
  if (!el) return;
  el.textContent = msg;
  el.style.display = show ? 'block' : 'none';
}

function triggerRandomSimulation() {
  const scenarios = [
    'Fire reported in Section 1 near the east entrance',
    'Medical emergency — someone fainted at Gate B',
    'Heavy crowd surge near Gate A, potential stampede risk',
    'Lost child spotted near the food court area',
    'Smoke detected in the VIP lounge section'
  ];
  if (DOM['ai-command-input']) {
    DOM['ai-command-input'].value = scenarios[Math.floor(Math.random() * scenarios.length)];
  }
  handleAICommand('admin');
}

// ========== PUBLIC API (for inline onclick handlers) ========== //

window.app = {
  /** Admin approves a pending alert */
  approveAlert: async (alertId) => {
    try {
      await updateAlertStatus(alertId, 'approved');
    } catch (err) {
      console.error('[App] Approve failed:', err);
    }
  },

  /** Admin dismisses an alert */
  dismissAlert: async (alertId) => {
    try {
      await updateAlertStatus(alertId, 'resolved');
    } catch (err) {
      console.error('[App] Dismiss failed:', err);
    }
  },

  /** Team dispatches or resolves an alert */
  teamAction: async (alertId, newStatus) => {
    try {
      await updateAlertStatus(alertId, newStatus);
      
      // Update local worker state for visual missions
      const workers = getState('workers');
      const alerts = getState('alerts');
      const alert = alerts.find(a => a.id === alertId);
      
      if (newStatus === 'dispatched' && alert) {
        // Find an idle worker of the same role
        const worker = workers.find(w => w.role === alert.teams[0] && !w.onMission);
        if (worker) worker.onMission = true;
      } else if (newStatus === 'resolved') {
        // Clear all missions for this alert's team (simplified)
        workers.forEach(w => { if (alert && alert.teams.includes(w.role)) w.onMission = false; });
      }
      
      setState('workers', workers);
    } catch (err) {
      console.error('[App] Team action failed:', err);
    }
  }
};
