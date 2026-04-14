// --- DATA SOURCE (Corresponds to Decision Engine bounds) --- //
const gates = [
  { name: 'Gate C', crowdLevel: 'low', waitTime: 5, distance: 400 },
  { name: 'Gate B', crowdLevel: 'medium', waitTime: 10, distance: 300 },
  { name: 'Gate A', crowdLevel: 'high', waitTime: 20, distance: 100 }
];

const exits = [
  { name: 'South Exit', crowdLevel: 'low', waitTime: 2, distance: 200 },
  { name: 'East Exit', crowdLevel: 'medium', waitTime: 8, distance: 50 },
  { name: 'North Exit', crowdLevel: 'high', waitTime: 15, distance: 150 }
];

const foodStalls = [
  { name: 'Snack Cart', crowdLevel: 'low', waitTime: 3, distance: 250 },
  { name: 'Pizza Corner', crowdLevel: 'medium', waitTime: 10, distance: 150 },
  { name: 'Burger Stand', crowdLevel: 'high', waitTime: 25, distance: 50 }
];

const washrooms = [
  { name: 'Section 3 Washroom', crowdLevel: 'low', waitTime: 1, distance: 100 },
  { name: 'Section 1 Washroom', crowdLevel: 'high', waitTime: 10, distance: 50 },
  { name: 'Section 2 Washroom', crowdLevel: 'medium', waitTime: 5, distance: 200 }
];

function getCrowdMultiplier(level) {
  if (level === 'high') return 50;
  if (level === 'medium') return 25;
  return 10;
}

// SCORE LOGIC: lower is better
function calculateScore(item) {
  const crowdNum = getCrowdMultiplier(item.crowdLevel);
  const score = (item.waitTime * 0.5) + (item.distance * 0.3) + (crowdNum * 0.2);
  return { ...item, score };
}

function getBestOption(options) {
  const scored = options.map(calculateScore);
  scored.sort((a, b) => a.score - b.score);
  return scored[0];
}

// Optionally hits the Gemini API using native fetch via Vite .env variables
async function useGeminiToFormat(promptText, fallbackAnswer) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return fallbackAnswer;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        systemInstruction: { parts: [{ text: "You are a fast, concise helpful stadium assistant responding to a stadium attendee. Give a 1 sentence human friendly direction. Output ONLY the one sentence answer. Do NOT wrap it in quotes. Keep it short and under 100 characters." }]}
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text.trim();
      }
    } else {
      console.error("Gemini non-ok response", response.status);
    }
  } catch (error) {
    console.error("Gemini failed:", error);
  }
  return fallbackAnswer;
}

async function handleAction(type) {
  const outputSection = document.getElementById('output-section');
  const answerText = document.getElementById('answer-text');
  const loader = document.getElementById('loader');
  
  // Show UI state
  outputSection.style.display = 'block';
  answerText.style.display = 'none';
  loader.style.display = 'block';

  let best, prompt, fallback;

  if (type === 'food') {
    best = getBestOption(foodStalls);
    fallback = `Go to ${best.name} – fastest choice (${best.waitTime} min wait)`;
    prompt = `The user asked for food. The mathematically optimal choice is ${best.name} since it has a ${best.waitTime} min wait and is ${best.distance}m away with ${best.crowdLevel} crowding. Give a direct fast human friendly recommendation.`;
  } else if (type === 'exit') {
    best = getBestOption(exits);
    fallback = `Head to ${best.name} – fastest exit (${best.waitTime} min wait)`;
    prompt = `The user asked to exit. The mathematically optimal choice is ${best.name} since it has a ${best.waitTime} min wait and is ${best.distance}m away with ${best.crowdLevel} crowding. Give a direct fast human friendly recommendation.`;
  } else if (type === 'washroom') {
    best = getBestOption(washrooms);
    fallback = `${best.name} is the best option – least crowded.`;
    prompt = `The user asked for a washroom. The mathematically optimal choice is ${best.name} since it has a ${best.waitTime} min wait and is ${best.distance}m away with ${best.crowdLevel} crowding. Give a direct fast human friendly recommendation.`;
  } else {
    best = getBestOption(gates);
    fallback = `Use ${best.name} – it is the best optimal gate (${best.waitTime} min wait).`;
    prompt = `The user asked for a gate to go towards. The mathematically optimal choice is ${best.name} since it has a ${best.waitTime} min wait and is ${best.distance}m away with ${best.crowdLevel} crowding. Give a direct fast human friendly recommendation.`;
  }

  // Await the Gemini formatting
  const sentence = await useGeminiToFormat(prompt, fallback);

  // Hide loader, show answer
  loader.style.display = 'none';
  answerText.style.display = 'block';
  answerText.textContent = sentence;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-food').addEventListener('click', () => handleAction('food'));
  document.getElementById('btn-exit').addEventListener('click', () => handleAction('exit'));
  document.getElementById('btn-washroom').addEventListener('click', () => handleAction('washroom'));
  document.getElementById('btn-gate').addEventListener('click', () => handleAction('gate'));
});
