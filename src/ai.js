/**
 * ai.js — Browser-side AI client
 *
 * Purpose: send sanitized UI requests to the backend AI route.
 * The Gemini key stays server-side in production and the frontend only
 * receives validated JSON responses.
 */

/**
 * Processes a natural language command through the backend AI service.
 * Falls back locally if the API is unavailable.
 * @param {string} userInput
 * @param {object} telemetry
 * @returns {Promise<object>}
 */
export async function processAIInput(userInput, telemetry = {}) {
  if (!userInput || typeof userInput !== 'string' || userInput.trim().length === 0) {
    return buildFallbackResponse('unknown input');
  }

  const sanitized = userInput.replace(/[<>{}]/g, '').slice(0, 500);

  try {
    const res = await fetch('/api/ai/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput: sanitized,
        telemetry,
      }),
    });

    if (!res.ok) {
      throw new Error(`AI request failed with ${res.status}`);
    }

    const data = await res.json();
    return validateAIResponse(data);
  } catch (err) {
    console.error('[AI]', err instanceof Error ? err.message : err);
    return buildFallbackResponse(sanitized);
  }
}

/**
 * Validates and normalizes the AI response shape.
 * @param {object} raw
 * @returns {object}
 */
export function validateAIResponse(raw) {
  const validIntents = ['fire', 'medical', 'crowd', 'navigation', 'lost_found'];
  const validTeams = ['fire', 'medical', 'police'];

  return {
    intent: validIntents.includes(raw?.intent) ? raw.intent : 'crowd',
    location: typeof raw?.location === 'string' ? raw.location : 'Unknown Area',
    severity: ['high', 'medium', 'low'].includes(raw?.severity) ? raw.severity : 'medium',
    actions: Array.isArray(raw?.actions) ? raw.actions.slice(0, 5) : [],
    teams: Array.isArray(raw?.teams) ? raw.teams.filter(team => validTeams.includes(team)) : ['police'],
    response: typeof raw?.response === 'string' ? raw.response : 'Alert processed.',
    isCritical: typeof raw?.isCritical === 'boolean' ? raw.isCritical : false,
  };
}

/**
 * Generates a deterministic browser fallback when the backend is unreachable.
 * @param {string} input
 * @returns {object}
 */
export function buildFallbackResponse(input) {
  const lower = (input || '').toLowerCase();
  let intent = 'crowd';
  let teams = ['police'];
  let isCritical = false;

  if (lower.includes('fire') || lower.includes('smoke') || lower.includes('burn')) {
    intent = 'fire';
    teams = ['fire', 'police'];
    isCritical = true;
  } else if (lower.includes('medic') || lower.includes('faint') || lower.includes('hurt') || lower.includes('injur') || lower.includes('bleed')) {
    intent = 'medical';
    teams = ['medical'];
    isCritical = true;
  } else if (lower.includes('lost') || lower.includes('missing') || lower.includes('child')) {
    intent = 'lost_found';
  } else if (lower.includes('crowd') || lower.includes('stampede') || lower.includes('push')) {
    isCritical = true;
  } else if (lower.includes('exit') || lower.includes('gate') || lower.includes('food') || lower.includes('washroom')) {
    intent = 'navigation';
  }

  return {
    intent,
    teams,
    isCritical,
    location: 'Reported Area',
    severity: isCritical ? 'high' : intent === 'navigation' ? 'low' : 'medium',
    actions: [`dispatch_${teams[0] || 'police'}`],
    response: `${intent.toUpperCase()} alert created. ${isCritical ? 'Immediate response required.' : 'Manual review recommended.'} (offline fallback mode)`,
  };
}
