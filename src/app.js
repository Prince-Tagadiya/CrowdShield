/**
 * app.js — Main Application Controller
 * 
 * Purpose: Manages authentication, UI routing, simulation,
 *          and connects all modules together.
 * 
 * Architecture:
 *   data.js     → Constants & mock data
 *   decision.js → Scoring & routing logic
 *   ai.js       → Gemini API integration
 *   alert.js    → Firestore persistence & real-time sync
 *   firebase.js → Auth & database config
 *   tests.js    → Automated validation
 */

import { auth, signInWithEmailAndPassword, onAuthStateChanged, signOut, identifyUserRole } from './firebase.js';
import { GATES, WORKERS, TEAM_ROLES, DEMO_EMAILS } from './data.js';
import { getBestGate, validateLocation } from './decision.js';
import { processAIInput } from './ai.js';
import { routeAlert, saveAlertToDB, updateAlertStatus } from './alert.js';
import { runAllTests } from './tests.js';

// --- GLOBAL APPLICATION STATE --- //
const state = {
  user: null,
  role: null,
  gates: GATES.map(g => ({ ...g })),     // Mutable copy
  workers: WORKERS.map(w => ({ ...w })),  // Mutable copy
  activeAlert: null,
  pendingReport: null,
  pendingAIAction: null
};

// Cache frequently accessed DOM elements
const DOM = {};

// ========== INITIALIZATION ========== //

document.addEventListener('DOMContentLoaded', () => {
  cacheDOMElements();
  setupEventListeners();
  runAllTests();
});

/**
 * Caches references to frequently used DOM elements.
 * Purpose: Avoid repeated document.getElementById calls (efficiency).
 */
function cacheDOMElements() {
  const ids = [
    'login-form', 'email', 'password', 'login-btn', 'login-error',
    'app-nav', 'user-email', 'role-badge', 'logout-btn',
    'login-screen', 'dashboard-container',
    'view-admin', 'view-team', 'view-attendee',
    'gate-stats', 'stadium-map', 'ai-command-input', 'ai-response-log',
    'ai-submit-btn', 'trigger-event-btn',
    'incoming-reports', 'report-summary', 'report-actions',
    'active-alert-widget', 'team-alerts', 'team-title',
    'emergency-banner', 'attendee-result',
    'report-input', 'report-submit-btn', 'report-feedback',
    'confirm-modal', 'modal-title', 'modal-desc',
    'modal-confirm', 'modal-cancel'
  ];
  ids.forEach(id => { DOM[id] = document.getElementById(id); });
}

// ========== AUTHENTICATION ========== //

/** Firebase auth state observer */
onAuthStateChanged(auth, (user) => {
  if (user) {
    state.user = user;
    state.role = identifyUserRole(user.email);
    renderDashboard();
  } else {
    resetState();
    showView('login-screen');
  }
});

/**
 * Binds all interactive event listeners.
 * Called once on DOMContentLoaded.
 */
function setupEventListeners() {
  DOM['login-form']?.addEventListener('submit', handleLogin);
  DOM['logout-btn']?.addEventListener('click', handleLogout);
  DOM['trigger-event-btn']?.addEventListener('click', triggerRandomSimulation);
  DOM['ai-submit-btn']?.addEventListener('click', () => handleAICommand('admin'));
  DOM['report-submit-btn']?.addEventListener('click', () => handleAICommand('attendee'));

  // Attendee quick-guide buttons
  ['food', 'exit', 'washroom', 'gate'].forEach(type => {
    document.getElementById(`btn-guide-${type}`)?.addEventListener('click', () => provideGuidance(type));
  });

  DOM['modal-confirm']?.addEventListener('click', executePendingAction);
  DOM['modal-cancel']?.addEventListener('click', closeConfirmModal);
}

/**
 * Handles login form submission.
 * Uses demo bypass for test emails, falls back to Firebase Auth.
 * @param {Event} e - Form submit event
 */
async function handleLogin(e) {
  e.preventDefault();
  const email = DOM['email'].value.trim().toLowerCase();
  const pass  = DOM['password'].value;
  const btn   = DOM['login-btn'];
  const err   = DOM['login-error'];

  // Input validation
  if (!email.includes('@')) {
    showError(err, 'Please enter a valid email (e.g. admin@test.com)');
    return;
  }

  hideError(err);
  btn.disabled = true;
  btn.textContent = 'Authenticating...';

  // Demo bypass for test emails
  if (DEMO_EMAILS.includes(email)) {
    setTimeout(() => {
      state.user = { email, uid: 'demo-mode' };
      state.role = identifyUserRole(email);
      btn.disabled = false;
      btn.textContent = 'Secure Login';
      renderDashboard();
    }, 500);
    return;
  }

  // Real Firebase Auth
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (error) {
    btn.disabled = false;
    btn.textContent = 'Secure Login';
    showError(err, 'Login failed. Use a test email or check credentials.');
    console.error('[Auth]', error.message);
  }
}

/** Logs user out and resets UI */
function handleLogout() {
  signOut(auth);
  resetState();
  showView('login-screen');
}

// ========== VIEW MANAGEMENT ========== //

/**
 * Shows the specified view and hides all others.
 * @param {string} viewId - DOM element ID to show
 */
function showView(viewId) {
  // Hide all views
  document.querySelectorAll('.view, #login-screen').forEach(el => el.classList.add('hidden'));
  document.getElementById(viewId)?.classList.remove('hidden');

  if (viewId === 'login-screen') {
    DOM['app-nav']?.classList.add('hidden');
    document.body.classList.remove('light-mode');
  } else {
    DOM['app-nav']?.classList.remove('hidden');
    if (DOM['user-email']) DOM['user-email'].textContent = state.user.email;
    if (DOM['role-badge']) DOM['role-badge'].textContent = state.role.toUpperCase();
  }
}

/**
 * Routes user to the correct dashboard based on role.
 */
function renderDashboard() {
  if (state.role === TEAM_ROLES.ADMIN) {
    showView('view-admin');
    initAdminMap();
    startSimulationLoop();
  } else if ([TEAM_ROLES.FIRE, TEAM_ROLES.MEDICAL, TEAM_ROLES.POLICE].includes(state.role)) {
    showView('view-team');
    if (DOM['team-title']) DOM['team-title'].textContent = `${state.role.toUpperCase()} Operations`;
    renderTeamAlerts();
  } else {
    showView('view-attendee');
    document.body.classList.add('light-mode');
  }
}

// ========== AI COMMAND & REPORTING ========== //

/**
 * Processes an AI command from either Admin console or Attendee report.
 * @param {string} source - 'admin' or 'attendee'
 */
async function handleAICommand(source) {
  const inputEl = source === 'admin' ? DOM['ai-command-input'] : DOM['report-input'];
  const command = inputEl?.value.trim();
  if (!command) return;

  // UI feedback
  if (source === 'attendee') {
    setFeedback(DOM['report-feedback'], 'Processing with CrowdShield AI...', true);
  } else {
    if (DOM['ai-response-log']) DOM['ai-response-log'].innerHTML = '<strong>[AI]:</strong> Analyzing...';
  }

  // Send to Gemini with current telemetry
  const telemetry = { gates: state.gates, activeAlert: state.activeAlert };
  const result = await processAIInput(command, telemetry);
  inputEl.value = '';

  if (source === 'attendee') {
    // Attendee reports go to admin pending queue
    state.pendingReport = { ...result, source: 'Attendee' };
    updateAdminReportFeed();
    setFeedback(DOM['report-feedback'], 'Report sent to Command Center.', true);
    setTimeout(() => setFeedback(DOM['report-feedback'], '', false), 5000);

    // Also save to Firestore
    await saveAlertToDB({
      type: result.intent, location: result.location,
      teams: result.teams, message: result.response
    });
  } else {
    // Admin: show AI response, then confirm or execute
    if (DOM['ai-response-log']) {
      DOM['ai-response-log'].innerHTML = `<strong>[AI]:</strong> ${result.response}`;
    }
    if (result.isCritical) {
      showConfirmModal(result);
    } else {
      executeAction(result);
    }
  }
}

// ========== GOVERNANCE (CONFIRMATION MODAL) ========== //

/**
 * Shows a modal asking admin to confirm a critical action.
 * @param {object} action - AI analysis result with isCritical=true
 */
function showConfirmModal(action) {
  state.pendingAIAction = action;
  if (DOM['modal-title']) DOM['modal-title'].textContent = `🚨 Confirm: ${(action.intent || 'ALERT').toUpperCase()}`;
  if (DOM['modal-desc'])  DOM['modal-desc'].textContent = action.response;
  DOM['confirm-modal']?.showModal();
}

function closeConfirmModal() {
  DOM['confirm-modal']?.close();
  state.pendingAIAction = null;
}

function executePendingAction() {
  if (state.pendingAIAction) {
    executeAction(state.pendingAIAction);
    closeConfirmModal();
  }
}

/**
 * Finalizes an action: creates alert, updates UI, saves to Firestore.
 * @param {object} action - { intent, location, teams, response }
 */
async function executeAction(action) {
  state.activeAlert = routeAlert(action);
  renderAlertWidget();
  updateAttendeeBanner();

  // Save to Firestore
  const docId = await saveAlertToDB({
    type: state.activeAlert.type,
    location: state.activeAlert.location,
    teams: state.activeAlert.teams,
    message: state.activeAlert.msg
  });
  if (docId) state.activeAlert.firestoreId = docId;

  if (['fire', 'medical', 'police'].includes(state.role)) renderTeamAlerts();
}

// ========== ADMIN FEATURES ========== //

function updateAdminReportFeed() {
  if (!state.pendingReport) {
    DOM['incoming-reports']?.classList.add('hidden');
    return;
  }
  DOM['incoming-reports']?.classList.remove('hidden');
  if (DOM['report-summary']) {
    DOM['report-summary'].innerHTML = `<strong>${(state.pendingReport.intent || '').toUpperCase()}</strong>: ${state.pendingReport.location}<br><small>${state.pendingReport.response}</small>`;
  }
  if (DOM['report-actions']) {
    DOM['report-actions'].innerHTML = `
      <button class="btn-action btn-dispatch" onclick="window.app.approveReport()" style="font-size:0.8rem;padding:5px 10px;">Execute</button>
      <button class="btn-action" onclick="window.app.dismissReport()" style="font-size:0.8rem;padding:5px 10px;background:#333;color:#fff;">Dismiss</button>`;
  }
}

/** Renders the stadium map with gates and worker dots */
function initAdminMap() {
  const map = DOM['stadium-map'];
  if (!map) return;
  map.innerHTML = '';

  // Place gates around the oval
  state.gates.forEach((g, i) => {
    const el = document.createElement('div');
    el.className = `gate bg-${g.level}`;
    el.textContent = g.name;
    const angle = [180, 270, 0][i] * (Math.PI / 180);
    el.style.left = `${50 + 45 * Math.cos(angle)}%`;
    el.style.top  = `${50 + 45 * Math.sin(angle)}%`;
    map.appendChild(el);
  });

  // Place worker dots
  state.workers.forEach(w => {
    const dot = document.createElement('div');
    dot.id = `worker-${w.id}`;
    dot.className = 'worker-dot';
    dot.style.background = `var(--${w.role})`;
    dot.style.left = `${w.x}%`;
    dot.style.top  = `${w.y}%`;
    map.appendChild(dot);
  });

  updateGateStats();
}

/**
 * Runs simulation loop: moves workers and fluctuates crowd levels.
 * Interval: 3 seconds. Only active for Admin role.
 */
function startSimulationLoop() {
  if (window._simInterval) clearInterval(window._simInterval);

  window._simInterval = setInterval(() => {
    if (state.role !== TEAM_ROLES.ADMIN) return;

    // Move workers (small random displacement)
    state.workers.forEach(w => {
      w.x = Math.max(15, Math.min(85, w.x + (Math.random() - 0.5) * 5));
      w.y = Math.max(15, Math.min(85, w.y + (Math.random() - 0.5) * 5));
      const dot = document.getElementById(`worker-${w.id}`);
      if (dot) { dot.style.left = `${w.x}%`; dot.style.top = `${w.y}%`; }
    });

    // Fluctuate gate crowd levels
    state.gates.forEach(g => {
      g.wait  = Math.max(1, Math.min(45, g.wait + (Math.random() > 0.5 ? 1 : -1)));
      g.level = g.wait > 20 ? 'high' : (g.wait > 10 ? 'med' : 'low');
    });

    updateGateStats();
  }, 3000);
}

// ========== UI RENDER FUNCTIONS ========== //

/** Updates the gate statistics sidebar */
function updateGateStats() {
  const el = DOM['gate-stats'];
  if (!el) return;
  el.innerHTML = state.gates.map(g => {
    const color = g.level === 'high' ? 'fire' : (g.level === 'med' ? 'warning' : 'medical');
    return `<div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:0.8rem;">
        <span>${g.name}</span><span>${g.wait}m</span>
      </div>
      <div style="height:4px;background:#333;border-radius:2px;">
        <div style="height:100%;width:${g.wait * 2}%;background:var(--${color});"></div>
      </div>
    </div>`;
  }).join('');
}

/** Shows the active alert widget on the admin map */
function renderAlertWidget() {
  const w = DOM['active-alert-widget'];
  if (!w || !state.activeAlert) return;
  w.classList.remove('hidden');
  w.innerHTML = `
    <h3>⚠️ ${state.activeAlert.type.toUpperCase()}</h3>
    <p>${state.activeAlert.location} — <strong>${state.activeAlert.status}</strong></p>
    <small>${state.activeAlert.msg}</small>
    <button onclick="window.app.clearAlert()" style="margin-top:10px;width:100%;background:#333;color:#fff;border:none;padding:5px;border-radius:4px;cursor:pointer;">Dismiss</button>`;
}

/** Renders alerts visible to the current team role */
function renderTeamAlerts() {
  const c = DOM['team-alerts'];
  if (!c) return;
  if (!state.activeAlert || !state.activeAlert.teams.includes(state.role)) {
    c.innerHTML = '<p>Standby: No priority alerts for your unit.</p>';
    return;
  }
  const a = state.activeAlert;
  c.innerHTML = `
    <article class="alert-card ${state.role.slice(0,3)}">
      <h3>Priority: ${a.type.toUpperCase()}</h3>
      <p><strong>Location:</strong> ${a.location}</p>
      <p><strong>Orders:</strong> ${a.msg}</p>
      <p><strong>Status:</strong> <span>${a.status}</span></p>
      <div class="modal-actions">
        <button class="btn-action btn-dispatch" onclick="window.app.teamAction('Dispatched')">Dispatch</button>
        <button class="btn-action btn-resolve" onclick="window.app.teamAction('Resolved')">Mark Resolved</button>
      </div>
    </article>`;
}

/**
 * Provides instant guidance to attendees using decision engine.
 * @param {string} type - food | exit | washroom | gate
 */
function provideGuidance(type) {
  const best = getBestGate(state.gates);
  const el = DOM['attendee-result'];
  if (!el) return;
  el.classList.remove('hidden');
  el.innerHTML = `<strong>Best ${type}:</strong> ${best.name} (${best.wait} min wait).`;
}

/** Shows/hides the emergency banner in attendee mode */
function updateAttendeeBanner() {
  const b = DOM['emergency-banner'];
  if (!b) return;
  if (state.activeAlert && ['fire', 'crowd'].includes(state.activeAlert.type)) {
    b.classList.remove('hidden');
    b.textContent = `🚨 EMERGENCY: ${state.activeAlert.type.toUpperCase()} at ${state.activeAlert.location}.`;
  } else {
    b.classList.add('hidden');
  }
}

// ========== UTILITY HELPERS ========== //

function showError(el, msg) { if (el) { el.textContent = msg; el.style.display = 'block'; } }
function hideError(el) { if (el) el.style.display = 'none'; }
function setFeedback(el, msg, show) { if (el) { el.textContent = msg; el.style.display = show ? 'block' : 'none'; } }

function resetState() {
  state.user = null;
  state.role = null;
  state.activeAlert = null;
  state.pendingReport = null;
  if (window._simInterval) clearInterval(window._simInterval);
}

function triggerRandomSimulation() {
  const msgs = ['fire in section 1', 'medical emergency at gate B', 'heavy crowd near gate A'];
  if (DOM['ai-command-input']) DOM['ai-command-input'].value = msgs[Math.floor(Math.random() * msgs.length)];
  handleAICommand('admin');
}

// ========== PUBLIC API (for inline onclick handlers) ========== //

window.app = {
  approveReport: () => {
    if (state.pendingReport) { executeAction(state.pendingReport); }
    state.pendingReport = null;
    DOM['incoming-reports']?.classList.add('hidden');
  },
  dismissReport: () => {
    state.pendingReport = null;
    DOM['incoming-reports']?.classList.add('hidden');
  },
  teamAction: async (newStatus) => {
    if (!state.activeAlert) return;
    state.activeAlert.status = newStatus;
    // Update Firestore if ID exists
    if (state.activeAlert.firestoreId) {
      await updateAlertStatus(state.activeAlert.firestoreId, newStatus.toLowerCase(), state.activeAlert.teams);
    }
    if (newStatus === 'Resolved') {
      state.activeAlert = null;
    }
    renderTeamAlerts();
  },
  clearAlert: () => {
    state.activeAlert = null;
    DOM['active-alert-widget']?.classList.add('hidden');
    updateAttendeeBanner();
  }
};
