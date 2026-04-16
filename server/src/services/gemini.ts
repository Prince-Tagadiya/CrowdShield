import { VertexAI } from '@google-cloud/vertexai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logInfo, logWarning, logError } from './logger';
import type { Zone, Alert } from '../types';

/**
 * Gemini AI service for VenueFlow.
 *
 * Uses Google Cloud Vertex AI when running on Cloud Run (production),
 * falling back to the direct Gemini API SDK for local development.
 * This dual-mode approach ensures the service works in both environments.
 *
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart-multimodal
 */

const GCP_PROJECT = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? 'venueflow-80ead';
const GCP_LOCATION = 'asia-south1';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Abstraction over the Gemini model — works with both Vertex AI and direct SDK.
 */
interface GeminiProvider {
  generateContent(prompt: string): Promise<string>;
}

/** Vertex AI provider — used in production (Cloud Run has implicit service account auth). */
function createVertexProvider(): GeminiProvider | null {
  try {
    const vertexAI = new VertexAI({ project: GCP_PROJECT, location: GCP_LOCATION });
    const model = vertexAI.getGenerativeModel({ model: GEMINI_MODEL });
    logInfo('Gemini initialized via Vertex AI', { project: GCP_PROJECT, location: GCP_LOCATION, model: GEMINI_MODEL });
    return {
      async generateContent(prompt: string): Promise<string> {
        const result = await model.generateContent(prompt);
        const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;
        return text ?? '';
      },
    };
  } catch (err) {
    logWarning('Vertex AI initialization failed, will use direct SDK', { error: String(err) });
    return null;
  }
}

/** Direct Gemini SDK provider — used in local development. */
function createDirectProvider(): GeminiProvider | null {
  if (!GEMINI_API_KEY) {
    logWarning('GEMINI_API_KEY not set — AI features will be unavailable');
    return null;
  }
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  logInfo('Gemini initialized via direct API key');
  return {
    async generateContent(prompt: string): Promise<string> {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      return result.response.text() ?? '';
    },
  };
}

// Initialize: prefer Vertex AI in production, fall back to direct SDK
const provider: GeminiProvider | null = isProduction
  ? (createVertexProvider() ?? createDirectProvider())
  : (createDirectProvider() ?? createVertexProvider());

/**
 * Retry wrapper with exponential backoff for Gemini API calls.
 * Handles 429 (rate limit) and 503 (overloaded) errors gracefully.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const status = (error as { status?: number }).status;
      const isRetryable = status === 429 || status === 503;
      if (!isRetryable || attempt === maxRetries) throw error;
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      logWarning(`Gemini rate limited (${status}), retrying in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Retry exhausted');
}

const VENUE_CONTEXT = `You are VenueFlow AI, an intelligent assistant for Wankhede Stadium in Mumbai, India.
The stadium has a capacity of approximately 33,000 and is used primarily for cricket matches.
You help attendees navigate the venue and find the best facilities based on LIVE crowd data.
Always base your answers on the real-time zone data provided — never guess or use static information.
Be concise, friendly, and actionable. Mention specific zone names and wait times.
If asked about something unrelated to the venue, politely redirect to venue topics.`;

const STAFF_CONTEXT = `You are VenueFlow AI, a crowd management advisor for Wankhede Stadium operations staff.
Analyze the provided real-time zone data and active alerts to generate actionable crowd management recommendations.
Focus on:
1. Identifying zones approaching or at critical capacity
2. Suggesting crowd redirection strategies (e.g., "redirect Gate A traffic to Gate B")
3. Recommending staff deployment based on wait times and congestion
4. Flagging potential safety concerns based on patterns
Be specific — reference zone names, exact occupancy percentages, and wait times.
Format as a numbered list of clear, actionable recommendations.`;

/**
 * Format zone data as a context string for Gemini.
 */
function formatZoneContext(zones: Zone[]): string {
  return zones.map(z => {
    const pct = z.capacity > 0 ? Math.round((z.currentOccupancy / z.capacity) * 100) : 0;
    return `- ${z.name} (${z.type}): ${z.currentOccupancy}/${z.capacity} (${pct}%), status: ${z.status}, wait: ${z.waitTimeMinutes} min`;
  }).join('\n');
}

/**
 * Format active alerts as context for Gemini.
 */
function formatAlertContext(alerts: Alert[]): string {
  if (alerts.length === 0) return 'No active alerts.';
  return alerts.map(a =>
    `- [${a.severity.toUpperCase()}] ${a.type} alert in zone ${a.zoneId}: ${a.description} (status: ${a.status})`
  ).join('\n');
}

/**
 * Attendee AI Chat — answers natural language questions grounded in live zone data.
 * Supports multi-turn conversation by including recent message history.
 * Uses Vertex AI (production) or direct Gemini SDK (development).
 */
export async function chatWithContext(
  userMessage: string,
  zones: Zone[],
  history?: Array<{ role: string; content: string }>
): Promise<string> {
  if (!provider) {
    return 'AI features are currently unavailable. Please check back later.';
  }

  const zoneContext = formatZoneContext(zones);

  // Build conversation log from history
  let conversationLog = '';
  if (history && history.length > 1) {
    const priorMessages = history.slice(0, -1); // Exclude the current message
    conversationLog = '\nRECENT CONVERSATION:\n' + priorMessages.map(m =>
      `${m.role === 'user' ? 'ATTENDEE' : 'AI'}: ${m.content}`
    ).join('\n') + '\n';
  }

  const prompt = `${VENUE_CONTEXT}

CURRENT LIVE ZONE DATA (updated in real-time):
${zoneContext}
${conversationLog}
ATTENDEE QUESTION: ${userMessage}

Respond helpfully based on the live data above. If this is a follow-up question, use the conversation context:`;

  try {
    const text = await withRetry(() => provider.generateContent(prompt));
    return text || 'I apologize, I could not generate a response. Please try again.';
  } catch (error) {
    logError('Gemini chat error', error);
    return 'I encountered an issue processing your request. Please try again in a moment.';
  }
}

/**
 * Staff AI Recommendations — generates crowd management advice from live data.
 * Uses Vertex AI (production) or direct Gemini SDK (development).
 */
export async function generateRecommendations(
  zones: Zone[],
  alerts: Alert[]
): Promise<string[]> {
  if (!provider) {
    return ['AI features are currently unavailable. Please check your Gemini API key configuration.'];
  }

  const zoneContext = formatZoneContext(zones);
  const alertContext = formatAlertContext(alerts);
  const prompt = `${STAFF_CONTEXT}

CURRENT LIVE ZONE DATA:
${zoneContext}

ACTIVE ALERTS:
${alertContext}

Generate 3-5 specific, actionable crowd management recommendations based on this data:`;

  try {
    const text = await withRetry(() => provider.generateContent(prompt));
    // Split numbered list into individual recommendations
    const recommendations = text
      .split(/\n(?=\d+\.)/)
      .map((r: string) => r.trim())
      .filter((r: string) => r.length > 0);
    return recommendations.length > 0
      ? recommendations
      : ['No specific recommendations at this time. All zones appear to be operating normally.'];
  } catch (error) {
    logError('Gemini recommendations error', error);
    return ['Unable to generate recommendations at this time. Please check zone data manually.'];
  }
}

/**
 * Alert Triage — assesses an alert and suggests response actions.
 * Only triggered when the zone is "crowded" or "critical" (debounced in route handler).
 * Uses Vertex AI (production) or direct Gemini SDK (development).
 */
export async function triageAlert(
  alert: Alert,
  zones: Zone[]
): Promise<string> {
  if (!provider) {
    return 'AI triage unavailable.';
  }

  const zoneContext = formatZoneContext(zones);
  const prompt = `${STAFF_CONTEXT}

A new alert has been created:
- Type: ${alert.type}
- Severity: ${alert.severity}
- Zone: ${alert.zoneId}
- Description: ${alert.description}

CURRENT ZONE DATA:
${zoneContext}

Assess this alert in the context of current crowd conditions and suggest 2-3 specific immediate response actions:`;

  try {
    const text = await withRetry(() => provider.generateContent(prompt));
    return text || 'Unable to triage this alert automatically.';
  } catch (error) {
    logError('Gemini triage error', error);
    return 'Automatic triage failed. Please assess manually.';
  }
}
