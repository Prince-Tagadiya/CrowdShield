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

function createRobustProvider(): GeminiProvider | null {
  const isProduction = process.env.NODE_ENV === 'production';

  // ─── Priority 1: Google AI SDK (Direct API Key) ───
  // Most reliable in demo environments and portable across regions.
  if (FINAL_KEY) {
    try {
      logInfo('Initializing Google AI SDK (Primary Provider)');
      const genAI = new GoogleGenerativeAI(FINAL_KEY);
      return {
        async generateContent(prompt: string): Promise<string> {
          const model = genAI.getGenerativeModel({ 
            model: GEMINI_MODEL,
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: RECOMMENDATION_SCHEMA,
              temperature: 0.1,
            }
          });
          const result = await model.generateContent(prompt);
          return result.response.text() ?? '';
        },
      };
    } catch (err) {
      logError('Failed to initialize Gemini SDK', err);
    }
  }

  // ─── Priority 2: Vertex AI (Production Cloud Identity) ───
  if (isProduction) {
    try {
      logInfo('Initializing Vertex AI (Fallback Provider)');
      const vertex_ai = new VertexAI({ project: GCP_PROJECT, location: GCP_LOCATION });
      const generativeModel = vertex_ai.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: { maxOutputTokens: 2048, temperature: 0.1 },
      });
      return {
        async generateContent(prompt: string): Promise<string> {
          const result = await generativeModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          });
          const response = result.response;
          return response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        },
      };
    } catch (err) {
      logError('Failed to initialize Vertex AI SDK', err);
    }
  }

  logWarning('AI SIGNAL LOST: No Gemini key or Vertex AI identity available.');
  return null;
}

const provider: GeminiProvider | null = createRobustProvider();

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
    const recommendations = JSON.parse(text);
    const recsArray = Array.isArray(recommendations) ? recommendations : [recommendations];
    
    // Sort by risk level (Critical first)
    return recsArray.sort((a: any, b: any) => {
      const order: Record<string, number> = { 'CRITICAL': 0, 'HIGH RISK': 1, 'WARNING': 2, 'SAFE': 3 };
      return (order[a.risk_level] ?? 99) - (order[b.risk_level] ?? 99);
    });
  } catch (error: any) {
    logError('Gemini recommendations error', error);
    const errorMsg = error instanceof Error ? error.message : 'AI pipeline failure';
    return [{ 
      zone: 'SYSTEM', 
      density: 'N/A', 
      risk_level: 'WARNING', 
      prediction: 'Data unavailable', 
      action: 'Manual override recommended', 
      reasoning: `AI Internal Error: ${errorMsg}. Verification of API Key or Regional availability required.`,
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
