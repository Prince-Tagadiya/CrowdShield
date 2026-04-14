import { auth, signInWithEmailAndPassword, onAuthStateChanged, signOut, identifyUserRole } from './firebase.js';
import { GATES, WORKERS, TEAM_ROLES } from './data.js';
import { findOptimalOption, validateLocation } from './logic.js';
import { parseIncidentCommand } from './ai.js';
import { runAllTests } from './tests.js';

// GLOBAL STATE
const state = {
  user: null,
  role: null,
  gates: [...GATES],
  workers: [...WORKERS],
  activeAlert: null,
  pendingReport: null 
};

// --- INITIALIZATION --- //
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  runAllTests();
});

// --- AUTHENTICATION --- //
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

function setupEventListeners() {
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    signOut(auth);
    resetState();
    showView('login-screen');
  });
  document.getElementById('trigger-event-btn')?.addEventListener('click', triggerRandomSimulation);
  document.getElementById('ai-submit-btn')?.addEventListener('click', () => handleAICommand('admin'));
  
  // Attendee Report
  document.getElementById('report-submit-btn')?.addEventListener('click', () => handleAICommand('attendee'));

  document.getElementById('btn-guide-food')?.addEventListener('click', () => provideGuidance('food'));
  document.getElementById('btn-guide-exit')?.addEventListener('click', () => provideGuidance('exit'));
  document.getElementById('btn-guide-washroom')?.addEventListener('click', () => provideGuidance('washroom'));
  document.getElementById('btn-guide-gate')?.addEventListener('click', () => provideGuidance('gate'));

  document.getElementById('modal-confirm')?.addEventListener('click', executePendingAction);
  document.getElementById('modal-cancel')?.addEventListener('click', closeConfirmModal);
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const pass = document.getElementById('password').value;
  const btn = document.getElementById('login-btn');
  const errorEl = document.getElementById('login-error');

  // Basic validation
  if (!email.includes('@')) {
    errorEl.textContent = "Please enter a valid email (e.g. admin@test.com)";
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = "Authenticating...";

  // DEMO MODE BYPASS: Allow seamless entry for test emails without Firebase Auth setup
  const demoEmails = ['admin@test.com', 'fire@test.com', 'med@test.com', 'pol@test.com', 'user@test.com'];
  
  if (demoEmails.includes(email)) {
    setTimeout(() => {
      state.user = { email: email, uid: 'demo-mode' };
      state.role = identifyUserRole(email);
      renderDashboard();
      
      // Reset button state for next time
      btn.disabled = false;
      btn.textContent = "Secure Login";
    }, 600); // Small delay to show "Authenticating..."
    return;
  }

  // Fallback to real Firebase Auth for custom emails
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "Secure Login";
    errorEl.textContent = "Login failed. Ensure you use one of the provided test emails.";
    errorEl.style.display = 'block';
    console.error(err);
  }
}

// --- VIEW MANAGEMENT --- //
function showView(viewId) {
  document.querySelectorAll('.view, #login-screen').forEach(el => el.classList.add('hidden'));
  document.getElementById(viewId)?.classList.remove('hidden');
  
  const nav = document.getElementById('app-nav');
  if (viewId === 'login-screen') {
    nav.classList.add('hidden');
    document.body.classList.remove('light-mode');
  } else {
    nav.classList.remove('hidden');
    document.getElementById('user-email').textContent = state.user.email;
    document.getElementById('role-badge').textContent = state.role.toUpperCase();
  }
}

function renderDashboard() {
  if (state.role === TEAM_ROLES.ADMIN) {
    showView('view-admin');
    initAdminMap();
    startSimulationLoop();
  } else if ([TEAM_ROLES.FIRE, TEAM_ROLES.MEDICAL, TEAM_ROLES.POLICE].includes(state.role)) {
    showView('view-team');
    renderTeamAlerts();
  } else {
    showView('view-attendee');
    document.body.classList.add('light-mode');
  }
}

// --- AI COMMAND & REPORTING --- //
async function handleAICommand(source) {
  const inputEl = source === 'admin' ? document.getElementById('ai-command-input') : document.getElementById('report-input');
  const logEl = document.getElementById('ai-response-log');
  const feedbackEl = document.getElementById('report-feedback');
  const command = inputEl.value.trim();
  
  if (!command) return;

  if (source === 'attendee') {
    feedbackEl.style.display = 'block';
    feedbackEl.textContent = "Processing report with CrowdShield AI...";
  } else {
    logEl.innerHTML = "<strong>[AI]:</strong> Analyzing command context...";
  }
  
  const telemetry = { gates: state.gates, activeAlert: state.activeAlert };
  const result = await parseIncidentCommand(command, telemetry);
  
  inputEl.value = '';
  
  if (source === 'attendee') {
    // Role-Based Logic: Attendee reports go to Admin Pending Feed
    state.pendingReport = { ...result, source: 'Attendee' };
    updateAdminReportFeed();
    feedbackEl.textContent = "Report received by Command Center. Security is analyzing.";
    setTimeout(() => { if(feedbackEl) feedbackEl.style.display = 'none'; }, 5000);
  } else {
    // Admin directly triggers confirmation or execution
    if (result.isCritical) {
      showConfirmModal(result);
    } else {
      executeAction(result);
    }
  }
}

function updateAdminReportFeed() {
  const feed = document.getElementById('incoming-reports');
  const summary = document.getElementById('report-summary');
  const actions = document.getElementById('report-actions');
  
  if (!state.pendingReport) {
    feed.classList.add('hidden');
    return;
  }

  feed.classList.remove('hidden');
  summary.innerHTML = `<strong>${state.pendingReport.intent.toUpperCase()}</strong>: ${state.pendingReport.location}<br><small>${state.pendingReport.response}</small>`;
  
  actions.innerHTML = `
    <button class="btn-action btn-dispatch" onclick="window.app.approveReport()" style="font-size: 0.8rem; padding: 5px 10px;">Execute AI Suggestions</button>
    <button class="btn-action" onclick="window.app.dismissReport()" style="font-size: 0.8rem; padding: 5px 10px; background: #333; color: #fff;">Dismiss</button>
  `;
}

function showConfirmModal(action) {
  state.pendingAIAction = action;
  const modal = document.getElementById('confirm-modal');
  document.getElementById('modal-title').textContent = `🚨 Confirm ${action.intent.toUpperCase()}`;
  document.getElementById('modal-desc').textContent = action.response;
  modal.showModal();
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').close();
  state.pendingAIAction = null;
}

function executePendingAction() {
  if (state.pendingAIAction) {
    executeAction(state.pendingAIAction);
    closeConfirmModal();
  }
}

function executeAction(action) {
  state.activeAlert = {
    id: Date.now(),
    type: action.intent,
    location: validateLocation(action.location),
    teams: action.teams,
    msg: action.response,
    status: 'Pending'
  };

  renderAlertWidget();
  updateAttendeeBanner();
  
  // If we are currently in a team view, refresh it
  if (['fire', 'medical', 'police'].includes(state.role)) renderTeamAlerts();
}

// --- TEAM DASHBOARD ACTIONS --- //
function renderTeamAlerts() {
  const container = document.getElementById('team-alerts');
  if (!container) return;

  if (!state.activeAlert || !state.activeAlert.teams.includes(state.role)) {
    container.innerHTML = '<p>Standby: No priority alerts for your unit.</p>';
    return;
  }

  const a = state.activeAlert;
  container.innerHTML = `
    <article class="alert-card ${state.role.slice(0,3)}">
      <h3>Priority: ${a.type.toUpperCase()}</h3>
      <p><strong>Location:</strong> ${a.location}</p>
      <p><strong>Orders:</strong> ${a.msg}</p>
      <p><strong>Status:</strong> <span id="task-status">${a.status}</span></p>
      <div class="modal-actions">
        <button class="btn-action btn-dispatch" onclick="window.app.teamAction('Dispatched')">Dispatch</button>
        <button class="btn-action btn-resolve" onclick="window.app.teamAction('Resolved')">Mark Resolved</button>
      </div>
    </article>
  `;
}

// --- ADMIN MAP & SIMULATION --- //
function initAdminMap() {
  const map = document.getElementById('stadium-map');
  if(!map) return;
  map.innerHTML = '';
  state.gates.forEach((g, i) => {
    const el = document.createElement('div');
    el.className = `gate bg-${g.level}`;
    el.textContent = g.name;
    const angles = [180, 270, 0];
    const angle = angles[i] * (Math.PI / 180);
    el.style.left = `${50 + 45 * Math.cos(angle)}%`;
    el.style.top = `${50 + 45 * Math.sin(angle)}%`;
    map.appendChild(el);
  });
  state.workers.forEach(w => {
    const dot = document.createElement('div');
    dot.id = `worker-${w.id}`;
    dot.className = 'worker-dot';
    dot.style.background = `var(--${w.role === 'fire' ? 'fire' : (w.role === 'medical' ? 'medical' : 'police')})`;
    dot.style.left = `${w.x}%`;
    dot.style.top = `${w.y}%`;
    map.appendChild(dot);
  });
  updateGateStats();
}

function startSimulationLoop() {
  if (window.simInterval) clearInterval(window.simInterval);
  window.simInterval = setInterval(() => {
    if (state.role !== TEAM_ROLES.ADMIN) return;
    state.workers.forEach(w => {
      w.x = Math.max(15, Math.min(85, w.x + (Math.random() - 0.5) * 5));
      w.y = Math.max(15, Math.min(85, w.y + (Math.random() - 0.5) * 5));
      const dot = document.getElementById(`worker-${w.id}`);
      if (dot) {
        dot.style.left = `${w.x}%`;
        dot.style.top = `${w.y}%`;
      }
    });
    state.gates.forEach(g => {
      g.wait = Math.max(1, Math.min(45, g.wait + (Math.random() > 0.5 ? 1 : -1)));
      g.level = g.wait > 20 ? 'high' : (g.wait > 10 ? 'med' : 'low');
    });
    updateGateStats();
  }, 3000);
}

// --- UI UPDATES --- //
function updateGateStats() {
  const container = document.getElementById('gate-stats');
  if (!container) return;
  container.innerHTML = state.gates.map(g => `
    <div class="stat-item" style="margin-bottom:10px;">
      <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
        <span>${g.name}</span><span>${g.wait}m</span>
      </div>
      <div style="height:4px; background:#333; border-radius:2px;">
        <div style="height:100%; width:${g.wait*2}%; background:var(--${g.level === 'high' ? 'fire' : (g.level === 'med' ? 'warning' : 'medical')});"></div>
      </div>
    </div>
  `).join('');
}

function renderAlertWidget() {
  const widget = document.getElementById('active-alert-widget');
  if (!widget || !state.activeAlert) return;
  widget.classList.remove('hidden');
  widget.innerHTML = `
    <h3>⚠️ ${state.activeAlert.type.toUpperCase()}</h3>
    <p>${state.activeAlert.location} - <strong>${state.activeAlert.status}</strong></p>
    <small>${state.activeAlert.msg}</small>
    <button onclick="window.app.clearAlert()" style="margin-top:10px; width:100%; background:#333; color:#fff; border:none; padding:5px; border-radius:4px; cursor:pointer;">Dismiss</button>
  `;
}

function provideGuidance(type) {
  const best = findOptimalOption(state.gates);
  const resultEl = document.getElementById('attendee-result');
  resultEl.classList.remove('hidden');
  resultEl.innerHTML = `<strong>Best ${type}:</strong> ${best.name} (${best.wait} min wait time).`;
}

function updateAttendeeBanner() {
  const banner = document.getElementById('emergency-banner');
  if (!banner) return;
  if (state.activeAlert && (state.activeAlert.type === 'fire' || state.activeAlert.type === 'crowd')) {
    banner.classList.remove('hidden');
    banner.textContent = `🚨 EMERGENCY: ${state.activeAlert.type.toUpperCase()} at ${state.activeAlert.location}.`;
  } else {
    banner.classList.add('hidden');
  }
}

// --- EXPOSE APP --- //
window.app = {
  approveReport: () => {
    executeAction(state.pendingReport);
    state.pendingReport = null;
    document.getElementById('incoming-reports').classList.add('hidden');
  },
  dismissReport: () => {
    state.pendingReport = null;
    document.getElementById('incoming-reports').classList.add('hidden');
  },
  teamAction: (newStatus) => {
    if (state.activeAlert) {
      state.activeAlert.status = newStatus;
      if (newStatus === 'Resolved') {
        alert("Well done unit. Incident resolved.");
        state.activeAlert = null;
      }
      renderTeamAlerts();
    }
  },
  clearAlert: () => {
    state.activeAlert = null;
    document.getElementById('active-alert-widget').classList.add('hidden');
    updateAttendeeBanner();
  }
};

function triggerRandomSimulation() {
  const options = ['fire in section 1', 'medical at gate B'];
  document.getElementById('ai-command-input').value = options[Math.floor(Math.random() * options.length)];
  handleAICommand('admin');
}

function resetState() {
  state.user = null;
  state.role = null;
  state.activeAlert = null;
  if(window.simInterval) clearInterval(window.simInterval);
}
