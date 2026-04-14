import { prepareFirebase } from './firebase.js';

// Internal Data structure mapping for simulated intelligence
const SYSTEM_STATE = {
  teams: {
    fire: { id: 'fire', name: 'Fire Team', tasks: [] },
    medical: { id: 'med', name: 'Medical Team', tasks: [] },
    police: { id: 'pol', name: 'Police Team', tasks: [] }
  }
};

const BASE_EVENTS = {
  'fire': { name: 'Fire', section: 'Section 2', icon: '🔥', primaryTeams: ['fire', 'police'], evacRequired: true },
  'medical': { name: 'Medical Emergency', section: 'Gate B', icon: '🚑', primaryTeams: ['medical'], evacRequired: false },
  'crowd': { name: 'Crowd Risk', section: 'Section 1', icon: '⚠️', primaryTeams: ['police'], evacRequired: false },
  'lost': { name: 'Lost Child', section: 'Gate A', icon: '🔍', primaryTeams: ['police'], evacRequired: false }
};

// Hit Gemini for humanized AI explanations
async function useGeminiForAI(eventData) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  // Raw fallback if API is unreachable
  const fallback = `${eventData.name} detected in ${eventData.section}. Dispatching ${eventData.primaryTeams.join(' and ')} teams. ${eventData.evacRequired ? 'Evacuate nearby areas immediately.' : 'No immediate evacuation needed.'}`;
  
  if (!apiKey) return fallback;

  try {
    const prompt = `A ${eventData.name} was just reported at ${eventData.section}. Required teams to dispatch are: ${eventData.primaryTeams.join(', ')}. Evacuation required: ${eventData.evacRequired}. Generate a 2 sentence rigid, professional command center AI output detailing what was found, who is being dispatched, and any evacuation notices.`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.candidates && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text.trim();
      }
    }
  } catch (err) {
    console.error(err);
  }
  return fallback;
}

// Function to trigger an entire event sequence
async function triggerEvent(eventType) {
  const eventData = BASE_EVENTS[eventType];
  
  // UI Loaders
  document.getElementById('ai-loader').style.display = 'block';
  
  // 1. Ask AI for formatted response
  const aiExplanation = await useGeminiForAI(eventData);
  document.getElementById('ai-loader').style.display = 'none';
  document.getElementById('ai-output').innerHTML = `<strong>[AI System Analysis]:</strong><br><br>${aiExplanation}`;

  // 2. Perform distribution logic
  const teamsNotified = eventData.primaryTeams.map(t => SYSTEM_STATE.teams[t].name);
  
  let distHtml = `
    <div class="dist-item">
      <h4>${eventData.icon} ${eventData.name} Alert – ${eventData.section}</h4>
      <p><strong>Teams Notified:</strong></p>
      <ul>${teamsNotified.map(t => `<li>${t}</li>`).join('')}</ul>
      <p><strong>Actions:</strong></p>
      <ul>
         ${teamsNotified.map(t => `<li>Dispatch ${t}</li>`).join('')}
         ${eventData.evacRequired ? `<li>Evacuate ${eventData.section} area</li>` : ''}
      </ul>
    </div>
  `;
  document.getElementById('alert-distribution').innerHTML = distHtml;

  // 3. Update top Live Widgets
  document.getElementById('live-alert-widget').style.display = 'block';
  document.getElementById('live-alert-icon').innerText = eventData.icon;
  document.getElementById('live-alert-title').innerText = `${eventData.icon} ${eventData.name} – ${eventData.section}`;
  document.getElementById('live-alert-text').innerText = `Status: Active | Teams dispatched: ${teamsNotified.join(', ')}`;

  if (eventData.evacRequired || eventType === 'crowd') {
    document.getElementById('attendee-warning-widget').style.display = 'block';
    document.getElementById('attendee-warning-text').innerText = `PUBLIC NOTIFICATION: Please avoid ${eventData.section} due to an ongoing incident.`;
  } else {
    document.getElementById('attendee-warning-widget').style.display = 'none';
  }

  // 4. Update Team Panel Tasks
  eventData.primaryTeams.forEach(teamKey => {
    // Push task silently
    SYSTEM_STATE.teams[teamKey].tasks.push(`${eventData.name} in ${eventData.section} - Pending Dispatch`);
  });
  renderTeamPanels();
}

function renderTeamPanels() {
  ['fire', 'med', 'pol'].forEach(prefix => {
    let teamKey = 'police';
    if(prefix === 'fire') teamKey = 'fire';
    if(prefix === 'med') teamKey = 'medical';

    const ul = document.getElementById(`${prefix}-tasks`);
    const tasks = SYSTEM_STATE.teams[teamKey].tasks;
    
    if (tasks.length === 0) {
      ul.innerHTML = '<li>No pending alerts.</li>';
    } else {
      ul.innerHTML = tasks.map(t => `<li>${t}</li>`).join('');
    }
  });
}

function clearSystem() {
  // Reset memory
  SYSTEM_STATE.teams.fire.tasks = [];
  SYSTEM_STATE.teams.medical.tasks = [];
  SYSTEM_STATE.teams.police.tasks = [];

  // Reset UI
  document.getElementById('ai-output').innerHTML = 'Waiting for events...';
  document.getElementById('alert-distribution').innerHTML = '<p>No active alerts distributed.</p>';
  document.getElementById('live-alert-widget').style.display = 'none';
  document.getElementById('attendee-warning-widget').style.display = 'none';
  
  renderTeamPanels();
}

document.addEventListener('DOMContentLoaded', () => {
  prepareFirebase(); // Firebase logic prep hook
  
  document.getElementById('btn-fire').addEventListener('click', () => triggerEvent('fire'));
  document.getElementById('btn-med').addEventListener('click', () => triggerEvent('medical'));
  document.getElementById('btn-crowd').addEventListener('click', () => triggerEvent('crowd'));
  document.getElementById('btn-lost').addEventListener('click', () => triggerEvent('lost'));
  
  document.getElementById('btn-clear').addEventListener('click', clearSystem);
});
