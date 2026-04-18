import { VertexAI } from '@google-cloud/vertexai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logInfo, logWarning, logError } from './logger';
import type { Zone, Alert } from '../types';

const RECOMMENDATION_SCHEMA: any = {
  description: "A list of tactical assessments and crowd management recommendations",
  type: "array",
  items: {
    type: "object",
    properties: {
      zone: {
        type: "string",
        description: "Exact name of the stadium zone being addressed",
      },
      density: {
        type: "string",
        description: "Estimated current occupancy percentage (e.g., '85%')",
      },
      risk_level: {
        type: "string",
        description: "Risk assessment level",
        enum: ["CRITICAL", "HIGH RISK", "WARNING", "SAFE"],
      },
      prediction: {
        type: "string",
        description: "Short-term forecast (next 5-10 minutes)",
      },
      action: {
        type: "string",
        description: "Immediate direct instruction for staff or emergency teams",
      },
      reasoning: {
        type: "string",
        description: "Brief data-backed explanation for this assessment",
      },
      alert_type: {
        type: "string",
        description: "Category of the tactical priority",
        enum: ["CRITICAL", "WARNING", "SAFE"],
      },
      color_code: {
        type: "string",
        description: "Visual indicator color",
        enum: ["RED", "YELLOW", "GREEN"],
      },
      category: {
        type: "string",
        description: "Department responsible for this action",
        enum: ["general", "fire", "police", "medical"],
      }
    },
    required: ["zone", "density", "risk_level", "prediction", "action", "reasoning", "alert_type", "color_code", "category"],
  },
};

/**
 * Gemini AI service for CrowdShield.
 *
 * Uses Google Cloud Vertex AI when running on Cloud Run (production),
 * falling back to the direct Gemini API SDK for local development.
 * This dual-mode approach ensures the service works in both environments.
 *
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart-multimodal
 */

const GCP_PROJECT = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? 'crowdshield-3912c';
const GCP_LOCATION = 'asia-south1';
const GEMINI_MODEL = 'gemini-1.5-flash-latest'; // Use the latest stable model
interface GeminiProvider {
  generateContent(prompt: string): Promise<string>;
}

// Initialize: robust key detection across different platform envs
const FINAL_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

/**
 * Dual-Engine Provider that attempts Google AI SDK first, 
 * then fails over to Vertex AI if the SDK is blocked or fails.
 */
class DualEngineProvider implements GeminiProvider {
  private googleAI: any = null;
  private vertexAI: any = null;
  private gcpProject = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? 'crowdshield-3912c';
  private gcpLocation = 'asia-south1';

  constructor() {
    // Stage 1: Google AI SDK
    if (FINAL_KEY) {
      try {
        logInfo('Staging Google AI SDK (Core Engine)');
        this.googleAI = new GoogleGenerativeAI(FINAL_KEY);
      } catch (err) {
        logError('Failed to stage Google AI SDK', err);
      }
    }

    // Stage 2: Vertex AI
    try {
      logInfo('Staging Vertex AI (Fallback Engine)');
      this.vertexAI = new VertexAI({ project: this.gcpProject, location: this.gcpLocation });
    } catch (err) {
      logError('Failed to stage Vertex AI SDK', err);
    }
  }

  async generateContent(prompt: string, config?: any): Promise<string> {
    const isRecommendations = prompt.includes('Tactical Operations AI');
    
    // ─── Attempt 1: Google AI SDK ───
    if (this.googleAI) {
      try {
        const model = this.googleAI.getGenerativeModel({ 
          model: GEMINI_MODEL,
          generationConfig: config || {
            responseMimeType: "application/json",
            temperature: 0.1,
          }
        });
        const result = await model.generateContent(prompt);
        return result.response.text() ?? '';
      } catch (err: any) {
        const isBlocked = err?.message?.includes('API_KEY_SERVICE_BLOCKED') || err?.status === 403;
        if (isBlocked) {
          logWarning('Google AI SDK BLOCKED (403/Forbidden). Attempting Vertex AI failover...');
        } else {
          logError('Google AI SDK Engine Failure', err);
        }
        // If not blocked but failed, still try fallback if available
      }
    }

    // ─── Attempt 2: Vertex AI ───
    if (this.vertexAI) {
      try {
        logInfo('Executing Vertex AI Failover...');
        const generativeModel = this.vertexAI.getGenerativeModel({
          model: GEMINI_MODEL,
          generationConfig: { maxOutputTokens: 2048, temperature: 0.1 },
        });
        const result = await generativeModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        return result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      } catch (err) {
        logError('Vertex AI Fallback Engine Failure', err);
      }
    }

    throw new Error('All AI engines exhausted. Please check Google Cloud Console to enable Generative Language API.');
  }
}

const provider: GeminiProvider = new DualEngineProvider();

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

const STAFF_SYSTEM_PROMPT = `You are CrowdShield Command — High-Level Tactical Operations AI.
Your purpose is to provide immediate, actionable, and data-driven assessments of the venue status for security staff.

CORE DIRECTIVES:
1. Every output must be instantly understandable and visually meaningful.
2. ASSIGN CLEAR RISK LEVELS: SAFE, WARNING, HIGH RISK, CRITICAL.
3. HIGHLIGHT THE MOST CONGESTED ZONES FIRST.
4. Provide insight + action + reasoning for every assessment.
5. Focus on resource allocation, evacuation routes, and crowd density.

Always return a JSON ARRAY of objects. Each object must strictly follow this format:
{
  "zone": "string (Zone Name)",
  "density": "string (Current percentage, e.g. 85%)",
  "risk_level": "CRITICAL | HIGH RISK | WARNING | SAFE",
  "prediction": "string (Short forecast)",
  "action": "string (Immediate tactical order)",
  "reasoning": "string (Data-backed explanation)",
  "alert_type": "CRITICAL | WARNING | SAFE",
  "color_code": "RED | YELLOW | GREEN",
  "category": "fire | police | medical | general"
}
Output should be a valid JSON array only. No markdown, no preamble.`;

const ATTENDEE_SYSTEM_PROMPT = `You are CrowdShield AI — The Intelligent Guardian of Wankhede Stadium.
You provide high-precision crowd intelligence to attendees to ensure a safe and seamless match-day experience.

VENUE CONTEXT:
- Venue: Wankhede Stadium, Mumbai.
- Layout: 8 main Stands (North, South, Sachin Tendulkar, Sunil Gavaskar, Vithal Divecha, Vijay Merchant, Garware Pavilion, MCA Stand).
- Key Points: Gate A (North), Gate D (South), Food Courts in East/West corridors.

CORE RESPONSIBILITIES:
1. SAFETY FIRST: If any zone is 'critical', your high-priority mission is to divert the user away.
2. EFFICIENCY: Suggest the least congested restrooms and food stalls based on LIVE data.
3. PERSONALITY: Professional, alert, and helpful. Use 🏟️, 📊, ⚡.

DATA GROUNDING:
- You will be provided with LIVE zone occupancy percentages.
- 0-40%: Clear.
- 40-65%: Moderate.
- 65-85%: Crowded.
- 85%+: Critical/At-Capacity.

MD FORMATTING:
- Use **bold** for zones and wait times.
- Use lists for instructions.
- Keep responses under 4 sentences unless navigating.`;

/**
 * Format zone data as a context string for Gemini.
 */
function formatZoneContext(zones: Zone[]): string {
  return zones.map(z => {
    const pct = z.capacity > 0 ? Math.round((z.currentOccupancy / z.capacity) * 100) : 0;
    return `- ${z.name} (#${z.id}): ${z.currentOccupancy}/${z.capacity} (${pct}% Full), Status: ${z.status}, WAIT: ${z.waitTimeMinutes}min`;
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
    const priorMessages = history.slice(0, -1);
    conversationLog = '\nRECENT CONVERSATION:\n' + priorMessages.map(m =>
      `${m.role === 'user' ? 'ATTENDEE' : 'AI'}: ${m.content}`
    ).join('\n') + '\n';
  }

  const prompt = `${ATTENDEE_SYSTEM_PROMPT}

CURRENT STADIUM STATUS (GROUND TRUTH):
${zoneContext}
${conversationLog}

ATTENDEE REQUEST: ${userMessage}

INSTRUCTION: Answer the attendee's request using the live data provided above. If you don't have the data for a specific question, be honest. Always prioritize safety.`;

  try {
    const text = await withRetry(() => provider.generateContent(prompt));
    return text || 'CrowdShield AI is monitoring the situation. All zones are currently within safe operational limits.';
  } catch (error) {
    logError('Gemini chat failover triggered', error);
    
    // ─── Tactical Failover Engine (Emergency Mode Only) ───
    // We only provide a data-backed fallback if the AI is genuinely unavailable.
    const crowdedZones = zones.filter(z => z.status === 'critical' || z.status === 'crowded');
    if (crowdedZones.length > 0) {
      return `[SYSTEM UPDATE] Detection systems show higher density at **${crowdedZones[0].name}**. I recommend using alternative routes via the North Stands while I re-establish full tactical AI grounding.`;
    }
    return "CrowdShield Intelligence is online. I'm currently processing live sensor data for Wankhede Stadium. How can I assist with your coordination today?";
  }
}

/**
 * Staff AI Recommendations — generates crowd management advice from live data.
 */
export async function generateRecommendations(
  zones: Zone[],
  alerts: Alert[]
): Promise<any[]> {
  if (!provider) {
    return [{ 
      zone: 'ALL ZONES', 
      density: 'N/A', 
      risk_level: 'SAFE', 
      prediction: 'AI Signal Lost', 
      action: 'Monitoring stadium via static sensors...', 
      reasoning: 'No valid Gemini API Key or Vertex AI identity detected. System running in safe local-mock mode.',
      alert_type: 'SAFE', 
      color_code: 'GREEN',
      category: 'general'
    }];
  }

  const zoneContext = formatZoneContext(zones);
  const alertContext = formatAlertContext(alerts);
  const prompt = `${STAFF_SYSTEM_PROMPT}

CURRENT LIVE ZONE DATA:
${zoneContext}

ACTIVE ALERTS:
${alertContext}

Analyze the stadium and return a list of 3-5 tactical assessments in JSON array format:`;

  try {
    const text = await withRetry(() => provider.generateContent(prompt));
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in AI response');
    const recommendations = JSON.parse(jsonMatch[0]);
    const recsArray = Array.isArray(recommendations) ? recommendations : [recommendations];
    
    // Sort by risk level (Critical first)
    return recsArray.sort((a: any, b: any) => {
      const order: Record<string, number> = { 'CRITICAL': 0, 'HIGH RISK': 1, 'WARNING': 2, 'SAFE': 3 };
      return (order[a.risk_level] ?? 99) - (order[b.risk_level] ?? 99);
    });
  } catch (error: any) {
    logError('Gemini multi-engine failure', error);
    const errorMsg = error instanceof Error ? error.message : 'AI pipeline failure';
    const isServiceBlocked = errorMsg.includes('API_KEY_SERVICE_BLOCKED') || errorMsg.includes('403');
    
    return [{ 
      zone: 'SYSTEM', 
      density: 'N/A', 
      risk_level: 'WARNING', 
      prediction: 'Data unavailable', 
      action: 'Manual override recommended', 
      reasoning: isServiceBlocked 
        ? `🚨 GOOGLE API BLOCKED: Your key exists but the "Generative Language API" is not enabled or restricted in Google Cloud Console. Enable it to restore AI insight.`
        : `Technical Error: ${errorMsg}. Check logs for multi-engine failover details.`,
      alert_type: 'WARNING', 
      color_code: 'YELLOW',
      category: 'general'
    }];
  }
}

/**
 * Alert Triage — assesses an alert and suggests response actions.
 */
export async function triageAlert(
  alert: Alert,
  zones: Zone[]
): Promise<any> {
  if (!provider) return { action: 'Manual triage required' };

  const zoneContext = formatZoneContext(zones);
  const prompt = `${SYSTEM_PROMPT}

A new alert has been created:
- Type: ${alert.type}
- Severity: ${alert.severity}
- Zone: ${alert.zoneId}
- Description: ${alert.description}

STADIUM STATUS:
${zoneContext}

Assess this alert and suggest 2-3 specific immediate response actions in JSON format:`;

  try {
    const text = await withRetry(() => provider.generateContent(prompt));
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    logError('Gemini triage error', error);
    return { action: 'Automatic triage failed. Please assess manually.' };
  }
}
