/**
 * ai.js — Google Gemini API Integration
 * 
 * Purpose: Sends natural language input + stadium telemetry to Gemini,
 *          receives structured JSON with intent, location, severity, and actions.
 * 
 * Security: API key loaded from environment variable VITE_GEMINI_API_KEY.
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL   = 'gemini-1.5-flash';
const BASE    = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Processes a natural language command through Gemini AI.
 * @param {string} userInput - Free-text incident report or question
 * @param {object} telemetry - Current stadium state { gates, activeAlert }
 * @returns {object} - Structured action object { intent, location, severity, teams, actions, response, isCritical }
 */
export async function processAIInput(userInput, telemetry) {
  if (!API_KEY) {
    console.warn('[AI] Gemini API key not configured. Using fallback.');
    return buildFallbackResponse(userInput);
  }

  // Sanitize user input to prevent prompt injection
  const sanitized = userInput.replace(/[<>{}]/g, '').slice(0, 500);

  const systemInstruction = `You are the CrowdShield Operational AI.
Analyze the user's message alongside current stadium telemetry.
Identify the intent, location, and severity.
Output strictly VALID JSON:
{
  "intent": "fire | medical | crowd | navigation | lost_found",
  "location": "string",
  "severity": "high | medium | low",
  "actions": ["dispatch_fire", "notify_police", "evacuate_area"],
  "teams": ["fire", "medical", "police"],
  "response": "human_friendly_1_sentence_summary",
  "isCritical": true
}`;

  const prompt = `STADIUM TELEMETRY: ${JSON.stringify(telemetry)}
USER MESSAGE: "${sanitized}"
Extract data and provide actionable instructions.`;

  try {
    const res = await fetch(`${BASE}/${MODEL}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (!res.ok) throw new Error(`Gemini API ${res.status}`);

    const data = await res.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (err) {
    console.error('[AI] Request failed:', err.message);
    return buildFallbackResponse(userInput);
  }
}

/**
 * Generates a basic structured response when AI is unavailable.
 * @param {string} input - Original user message
 * @returns {object} - Fallback action object
 */
function buildFallbackResponse(input) {
  const lower = input.toLowerCase();
  let intent = 'crowd', teams = ['police'], isCritical = false;

  if (lower.includes('fire'))    { intent = 'fire';    teams = ['fire', 'police']; isCritical = true; }
  if (lower.includes('medic') || lower.includes('faint') || lower.includes('hurt'))
                                 { intent = 'medical'; teams = ['medical'];        isCritical = true; }
  if (lower.includes('lost'))    { intent = 'lost';    teams = ['police'];         isCritical = false; }

  return {
    intent, teams, isCritical,
    location: 'Reported Area',
    severity: isCritical ? 'high' : 'medium',
    actions: [`dispatch_${teams[0]}`],
    response: `${intent.toUpperCase()} alert created. Manual routing required (AI offline).`
  };
}
