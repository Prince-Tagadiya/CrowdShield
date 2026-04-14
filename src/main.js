// Prepare Firebase
// The config is loaded here, but full integration happens later
import { prepareFirebase } from './firebase.js';

// --- INITIAL DATA --- //
let gates = [
  { id: 'gate-a', name: 'Gate A', crowdLevel: 'high', waitTime: 20 },
  { id: 'gate-b', name: 'Gate B', crowdLevel: 'medium', waitTime: 10 },
  { id: 'gate-c', name: 'Gate C', crowdLevel: 'low', waitTime: 5 }
];

const sections = [
  { id: 'sec-1', name: 'Section 1', density: 'high' },
  { id: 'sec-2', name: 'Section 2', density: 'medium' },
  { id: 'sec-3', name: 'Section 3', density: 'low' }
];

// x, y relative to the stadium shape container (0-100%)
let workers = [
  { id: 'w1', role: 'fire', x: 20, y: 30, status: 'patrol' },
  { id: 'w2', role: 'medical', x: 80, y: 70, status: 'standby' },
  { id: 'w3', role: 'police', x: 50, y: 20, status: 'patrol' },
  { id: 'w4', role: 'medical', x: 40, y: 80, status: 'patrol' },
  { id: 'w5', role: 'police', x: 10, y: 50, status: 'patrol' }
];

const alerts = [
  "Avoid Gate A – heavy crowd",
  "Section 1 filling fast"
];

const aiSuggestions = [
  "Send 2 staff to Gate A",
  "Redirect crowd to Gate C"
];

// --- RENDER LOGIC --- //

function renderGates() {
  gates.forEach(gate => {
    const el = document.getElementById(gate.id);
    if (!el) return;
    
    // Clear old bg classes
    el.classList.remove('bg-low', 'bg-medium', 'bg-high');
    el.classList.add(`bg-${gate.crowdLevel}`);
  });
}

function renderWorkerDots() {
  const layer = document.getElementById('workers-layer');
  if (!layer) return;

  workers.forEach(worker => {
    let dot = document.getElementById(`worker-${worker.id}`);
    if (!dot) {
      dot = document.createElement('div');
      dot.id = `worker-${worker.id}`;
      dot.className = `worker-dot worker-${worker.role}`;
      layer.appendChild(dot);
    }
    
    dot.style.left = `${worker.x}%`;
    dot.style.top = `${worker.y}%`;
  });
}

function renderRightPanel() {
  // Gate Status
  const gateList = document.getElementById('gate-status-list');
  gateList.innerHTML = '';
  gates.forEach(gate => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="gate-name">${gate.name}</span> – <span class="text-${gate.crowdLevel}">${gate.crowdLevel}</span> – ${gate.waitTime} min wait`;
    gateList.appendChild(li);
  });

  // Alerts
  const alertsList = document.getElementById('alerts-list');
  alertsList.innerHTML = '';
  alerts.forEach(msg => {
    const li = document.createElement('li');
    li.textContent = msg;
    alertsList.appendChild(li);
  });

  // AI Suggestions
  const aiList = document.getElementById('ai-suggestions-list');
  aiList.innerHTML = '';
  aiSuggestions.forEach(msg => {
    const li = document.createElement('li');
    li.textContent = msg;
    aiList.appendChild(li);
  });
}

// --- SIMULATION --- //

function updateWorkerPositions() {
  workers.forEach(w => {
    // move randomly by -5 to +5 percent
    const dx = (Math.random() - 0.5) * 10;
    const dy = (Math.random() - 0.5) * 10;
    
    // clamp within 5% to 95%
    w.x = Math.max(5, Math.min(95, w.x + dx));
    w.y = Math.max(5, Math.min(95, w.y + dy));
  });
}

function simulate() {
  updateWorkerPositions();
  
  // Randomly fluctuate wait times slightly for dynamic feel
  gates.forEach(gate => {
    if (Math.random() > 0.7) {
      const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
      gate.waitTime = Math.max(0, gate.waitTime + change);
    }
  });

  renderGates();
  renderRightPanel();
  renderWorkerDots();
}

// --- INIT --- //
function init() {
  console.log("CrowdShield initialized");
  prepareFirebase();
  
  renderGates();
  renderRightPanel();
  renderWorkerDots();

  // Run simulation every 3 seconds
  setInterval(simulate, 3000);
}

document.addEventListener('DOMContentLoaded', init);
