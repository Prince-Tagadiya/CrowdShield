import { prepareFirebase } from './firebase.js';

// Elements
const btnBroadcast = document.getElementById('btn-broadcast');
const btnPolice = document.getElementById('btn-police');
const broadcastStatus = document.getElementById('broadcast-status');
const btnReportFound = document.getElementById('btn-report-found');
const foundLocationInput = document.getElementById('found-location-input');
const aiLoader = document.getElementById('ai-loader');
const systemResponse = document.getElementById('system-response');

// State flags
let alertSent = false;

// 1. Alert Broadcast Actions
function showBroadcastMessage(msg) {
  broadcastStatus.style.display = 'block';
  broadcastStatus.textContent = msg;
  alertSent = true;
}

btnBroadcast.addEventListener('click', () => {
  showBroadcastMessage("Alert sent to all teams, stewards, and connected attendee mobile devices.");
  btnBroadcast.style.opacity = '0.5';
  btnBroadcast.style.pointerEvents = 'none';
});

btnPolice.addEventListener('click', () => {
  showBroadcastMessage("High-priority alert instantly dispatched to Police and Security checkpoints.");
  btnPolice.style.opacity = '0.5';
  btnPolice.style.pointerEvents = 'none';
});


// 2. Recovery Logic via Gemini
async function useGeminiForRecovery(foundLocation) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  // Local Fallback
  const fallback = `<strong>Child safely located at ${foundLocation}.</strong><br><br>Actions executed:<ul><li>Guide parent safely from Section 5 to ${foundLocation}.</li><li>Police team notified to stand down.</li></ul>`;
  
  if (!apiKey) return fallback;

  try {
    const prompt = `A lost 6 year old child was just found at ${foundLocation}. The parent is currently waiting at Section 5. Provide a 2 sentence official system response stating where the child is, instructing staff to guide the parent there, and canceling the police search.`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: "You are the central logic of CrowdShield. Output ONLY the raw response without any markdown wrapping or bolding, keeping it concise and authoritative." }]}
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.candidates && data.candidates[0].content) {
        // Wrap AI response in UI list elements
        const aiText = data.candidates[0].content.parts[0].text.trim();
        return `<strong>System Update Registered:</strong><br><br>${aiText}<br><br>Actions auto-executed:<ul><li>Guide parent to ${foundLocation}</li><li>Police team notified: Mission Success</li></ul>`;
      }
    }
  } catch (err) {
    console.error(err);
  }
  return fallback;
}

// Handle Form Submission
btnReportFound.addEventListener('click', async () => {
  const loc = foundLocationInput.value.trim();
  if (!loc) {
    alert("Please enter a valid found location.");
    return;
  }

  // Show UI states
  systemResponse.style.display = 'none';
  aiLoader.style.display = 'block';
  
  // Await AI resolution mapping
  const responseHtml = await useGeminiForRecovery(loc);
  
  // Display result
  aiLoader.style.display = 'none';
  systemResponse.style.display = 'block';
  systemResponse.innerHTML = responseHtml;
});

document.addEventListener('DOMContentLoaded', () => {
  prepareFirebase(); // Firebase hook readied
});
