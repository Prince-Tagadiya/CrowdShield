import { prepareFirebase } from './firebase.js';

// --- DATA SOURCE --- //
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

// Helper: Convert crowd string to numerical penalty
function getCrowdMultiplier(level) {
  if (level === 'high') return 50;
  if (level === 'medium') return 25;
  return 10;
}

// SCORE LOGIC: score = (waitTime * 0.5) + (distance * 0.3) + (crowdLevel * 0.2)
function calculateScore(item) {
  const crowdNum = getCrowdMultiplier(item.crowdLevel);
  const score = (item.waitTime * 0.5) + (item.distance * 0.3) + (crowdNum * 0.2);
  return { ...item, score };
}

// Score and sort options
function processOptions(options) {
  const scored = options.map(calculateScore);
  scored.sort((a, b) => a.score - b.score); // Ascending, lower score is better
  return scored;
}

// Explain WHY it's the best option
function getExplanation(best, others) {
  const avgWait = others.reduce((acc, o) => acc + o.waitTime, 0) / others.length;
  const avgDist = others.reduce((acc, o) => acc + o.distance, 0) / others.length;
  
  if (best.waitTime < avgWait && best.distance > avgDist) {
    return "Slightly farther, but significantly faster wait time makes it best overall.";
  } else if (best.waitTime < avgWait) {
    return "Lower wait time saves time significantly compared to other options.";
  } else if (best.distance < avgDist) {
    return "Closer proximity and balanced wait makes it the optimal choice.";
  } else if (best.crowdLevel === 'low') {
    return "Less crowded compared to other options.";
  }
  return "Optimal balance of distance, wait time, and crowd conditions.";
}

function renderSection(sectionId, data) {
  const listEl = document.getElementById(`${sectionId}-list`);
  const highlightEl = document.getElementById(`best-${sectionId}-highlight`);
  
  if (!listEl || !highlightEl) return;

  const processed = processOptions(data);
  const best = processed[0];
  const others = processed.slice(1);
  
  // Render Highlight for the Best Choice
  const explanation = getExplanation(best, others);
  highlightEl.innerHTML = `
    <h3>${best.name} is the Best Option</h3>
    <p class="reason">“${explanation}”</p>
    <div class="metrics">
      <span>⏱ ${best.waitTime} min</span>
      <span>🚶 ${best.distance}m</span>
      <span>👥 ${best.crowdLevel}</span>
      <span>⚡ Score: ${best.score.toFixed(1)}</span>
    </div>
  `;
  
  // Render All Options
  listEl.innerHTML = '';
  processed.forEach((item, index) => {
    const isBest = index === 0;
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="option-header ${isBest ? 'is-best' : ''}">
        <span>${item.name} ${isBest ? '&nbsp;(Recommended)' : ''}</span>
        <span>Score: ${item.score.toFixed(1)}</span>
      </div>
      <div class="option-metrics">
        <span>⏱ ${item.waitTime} min wait</span>
        <span>🚶 ${item.distance}m distance</span>
        <span>👥 ${item.crowdLevel} crowd</span>
      </div>
    `;
    listEl.appendChild(li);
  });
}

// Initialization
function init() {
  console.log("Decision Engine initialized");
  prepareFirebase();
  
  renderSection('gate', gates);
  renderSection('exit', exits);
  renderSection('food', foodStalls);
}

document.addEventListener('DOMContentLoaded', init);
