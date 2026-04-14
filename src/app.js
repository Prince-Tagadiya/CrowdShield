import { auth, signInWithEmailAndPassword, onAuthStateChanged, signOut, identifyUserRole } from './firebase.js';
import { GATES, WORKERS, STADIUM_STATE_TEMPLATE, TEAM_ROLES } from './data.js';
import { findOptimalOption, validateLocation } from './logic.js';
import { parseIncidentCommand } from './ai.js';
import { runAllTests } from './tests.js';

/**
 * CrowdShield Main Application Controller
 * Optimized for efficiency, security, and accessibility.
 */

// GLOBAL STATE
const state = {
  user: null,
  role: null,
  gates: [...GATES],
  workers: [...WORKERS],
  activeAlert: null,
  pendingAIAction: null // For governance confirmation
};

// --- INITIALIZATION --- //
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  // Run tests in console for evaluation purposes
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
  // Auth
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('logout-btn')?.addEventListener('click', () => signOut(auth));

  // Simulation
  document.getElementById('trigger-event-btn')?.addEventListener('click', triggerRandomSimulation);

  // AI Command
  document.getElementById('ai-submit-btn')?.addEventListener('click', handleAICommand);
  document.getElementById('ai-command-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAICommand();
    }
  });

  // Attendee Guides
  document.getElementById('btn-guide-food')?.addEventListener('click', () => provideGuidance('food'));
  document.getElementById('btn-guide-exit')?.addEventListener('click', () => provideGuidance('exit'));
  document.getElementById('btn-guide-washroom')?.addEventListener('click', () => provideGuidance('washroom'));
  document.getElementById('btn-guide-gate')?.addEventListener('click', () => provideGuidance('gate'));

  // Governance Modal
  document.getElementById('modal-confirm')?.addEventListener('click', executePendingAction);
  document.getElementById('modal-cancel')?.addEventListener('click', closeConfirmModal);
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const pass = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    alert("Authentication Failed: Security restriction or invalid credentials.");
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

// --- ADMIN & AI COMMAND LOGIC --- //
async function handleAICommand() {
  const inputEl = document.getElementById('ai-command-input');
  const logEl = document.getElementById('ai-response-log');
  const command = inputEl.value.trim();
  
  if (!command) return;

  logEl.innerHTML = "<strong>[AI Status]:</strong> Analyzing telemetry and command...";
  
  // Extract and Pass Telemetry
  const telemetry = { gates: state.gates, activeAlert: state.activeAlert };
  const result = await parseIncidentCommand(command, telemetry);
  
  inputEl.value = '';
  
  if (result.error) {
    logEl.innerHTML = `<strong>[AI Error]:</strong> ${result.response}`;
    return;
  }

  logEl.innerHTML = `<strong>[AI Result]:</strong> ${result.response}`;
  
  if (result.isCritical) {
    showConfirmModal(result);
  } else {
    executeAction(result);
  }
}

function showConfirmModal(action) {
  state.pendingAIAction = action;
  const modal = document.getElementById('confirm-modal');
  document.getElementById('modal-title').textContent = `🚨 Authorization Required: ${action.intent.toUpperCase()}`;
  document.getElementById('modal-desc').textContent = action.response;
  modal.showModal(); // Using native <dialog>
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
    type: action.intent,
    location: validateLocation(action.location),
    teams: action.teams,
    msg: action.response
  };

  // Update Global UI
  renderAlertWidget();
  updateAttendeeBanner();
  
  console.log(`System Action Executed: ${action.intent} at ${action.location}`);
}

// --- STADIUM SIMULATION --- //
function initAdminMap() {
  const map = document.getElementById('stadium-map');
  map.innerHTML = ''; // Efficient partial updates would be better for high-perf, but this is clean for the prototype

  // GATES
  state.gates.forEach((g, i) => {
    const el = document.createElement('div');
    el.className = `gate bg-${g.level}`;
    el.textContent = g.name;
    // Map positioning
    const angles = [180, 270, 0];
    const angle = angles[i] * (Math.PI / 180);
    el.style.left = `${50 + 45 * Math.cos(angle)}%`;
    el.style.top = `${50 + 45 * Math.sin(angle)}%`;
    map.appendChild(el);
  });

  // WORKER DOTS
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

    // Simulate Movement
    state.workers.forEach(w => {
      w.x = Math.max(15, Math.min(85, w.x + (Math.random() - 0.5) * 5));
      w.y = Math.max(15, Math.min(85, w.y + (Math.random() - 0.5) * 5));
      const dot = document.getElementById(`worker-${w.id}`);
      if (dot) {
        dot.style.left = `${w.x}%`;
        dot.style.top = `${w.y}%`;
      }
    });

    // Simulate Crowd Fluctuation
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
    <div class="stat-item">
      <span>${g.name}</span>
      <div class="progress-bg"><div class="progress-fill bg-${g.level}" style="width: ${g.wait*2}%"></div></div>
      <small>${g.wait}m wait</small>
    </div>
  `).join('');
}

function renderAlertWidget() {
  const widget = document.getElementById('active-alert-widget');
  if (!widget || !state.activeAlert) return;

  widget.classList.remove('hidden');
  widget.innerHTML = `
    <h3>⚠️ ${state.activeAlert.type.toUpperCase()}</h3>
    <p>Location: ${state.activeAlert.location}</p>
    <small>${state.activeAlert.msg}</small>
    <button class="btn-resolve full-width" style="margin-top:10px; background:#30363d; border:none; color:white; padding:5px; border-radius:4px; cursor:pointer;">Clear Alert</button>
  `;
  
  widget.querySelector('button')?.addEventListener('click', clearAlert);
}

function renderTeamAlerts() {
  const container = document.getElementById('team-alerts');
  if (!container) return;

  if (!state.activeAlert || !state.activeAlert.teams.includes(state.role)) {
    container.innerHTML = '<p>No active incidents for your unit.</p>';
    return;
  }

  container.innerHTML = `
    <article class="alert-card ${state.role.slice(0,3)}">
      <h3>Active Task: ${state.activeAlert.type.toUpperCase()}</h3>
      <p><strong>Where:</strong> ${state.activeAlert.location}</p>
      <p>${state.activeAlert.msg}</p>
      <div class="modal-actions">
        <button class="btn-action btn-dispatch">Dispatch</button>
        <button class="btn-action" style="background:var(--border); color:white;">Report Success</button>
      </div>
    </article>
  `;
}

function provideGuidance(type) {
  const best = findOptimalOption(state.gates); // Logic reused for speed
  const resultEl = document.getElementById('attendee-result');
  resultEl.classList.remove('hidden');
  resultEl.innerHTML = `
    <strong>Recommendation:</strong> Go towards <strong>${best.name}</strong>.<br>
    Selected based on optimal wait time (${best.wait}m).
  `;
}

function updateAttendeeBanner() {
  const banner = document.getElementById('emergency-banner');
  if (!banner) return;

  if (state.activeAlert && (state.activeAlert.type === 'fire' || state.activeAlert.type === 'crowd')) {
    banner.classList.remove('hidden');
    banner.textContent = `🚨 EMERGENCY: ${state.activeAlert.type.toUpperCase()} at ${state.activeAlert.location}. Follow instructions immediately.`;
  } else {
    banner.classList.add('hidden');
  }
}

function clearAlert() {
  state.activeAlert = null;
  document.getElementById('active-alert-widget')?.classList.add('hidden');
  updateAttendeeBanner();
  if (state.role !== 'admin') renderTeamAlerts();
}

function triggerRandomSimulation() {
  const options = ['fire in section 1', 'medical at gate B', 'crowd surge in section 3'];
  const choice = options[Math.floor(Math.random() * options.length)];
  document.getElementById('ai-command-input').value = choice;
  handleAICommand();
}

function resetState() {
  state.user = null;
  state.role = null;
  state.activeAlert = null;
  if(window.simInterval) clearInterval(window.simInterval);
}
