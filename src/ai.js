/**
 * ai.js - Google Gemini Integration
 * Handles natural language processing and intent extraction.
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

/**
 * Parses a natural language incident command and returns structured JSON.
 * @param {string} userInput - The message from the Admin/Attendee
 * @param {object} telemetry - Current stadium state (gates, workers, etc.)
 */
export async function parseIncidentCommand(userInput, telemetry) {
  if (!API_KEY) {
    console.error("Gemini API Key missing.");
    return { error: "Configuration Error" };
  }

  const systemInstruction = `
    You are the CrowdShield Operational AI. 
    Analyze the user's message alongside current stadium telemetry.
    Identify the intent, location, and severity.
    
    Output strictly VALID JSON in this format:
    {
      "intent": "fire | medical | crowd | navigation | lost_found",
      "location": "string",
      "severity": "high | medium | low",
      "actions": ["array_of_dispatch_actions"],
      "teams": ["fire", "medical", "police"],
      "response": "human_friendly_summary",
      "isCritical": boolean
    }
  `;

  const prompt = `
    CURRENT STADIUM TELEMETRY:
    ${JSON.stringify(telemetry)}

    USER MESSAGE:
    "${userInput}"
    
    Extract data and provide actionable system instructions.
  `;

  try {
    const response = await fetch(`${MODEL_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) throw new Error(`API returned ${response.status}`);

    const data = await response.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    return result;
  } catch (err) {
    console.error("AI Command Parsing Failed:", err);
    return { 
      error: "AI_OFFLINE", 
      intent: "unknown", 
      response: "System offline. Manually route alert via Command Panel." 
    };
  }
}
