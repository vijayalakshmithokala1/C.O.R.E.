/**
 * C.O.R.E. AI Triage Utility
 *
 * Uses Gemini API (gemini-1.5-flash) for intelligent incident analysis.
 * Falls back to heuristic analysis if GEMINI_API_KEY is not set or the API call fails.
 */

const SEVERITY_LEVELS = {
  LOW: { score: 2, sentiment: 'Minor' },
  MEDIUM: { score: 5, sentiment: 'Urgent' },
  HIGH: { score: 9, sentiment: 'Critical' },
};

const TRIAGE_DATABASE = {
  Fire: {
    high: ['Smell of gas', 'Trapped', 'Explosion', 'Out of control', 'Basement'],
    instructions: 'Evacuate immediately. Do not use elevators. If safe, pull the nearest manual fire alarm station. Wait for rescue team outside.',
    suggestedResponse: 'Activate fire suppression team. Alert all floors. Coordinate with fire department. Establish incident command post at main entrance.',
  },
  'Medical Emergency': {
    high: ['Chest pain', 'Unconscious', 'Seizure', 'Choking', 'Stroke', 'Heavy bleeding', 'Breathing'],
    instructions: 'Lay the person flat. If unconscious, check pulse. Do not give water. Clear the area for medical staff arrival.',
    suggestedResponse: 'Dispatch nearest medical responder with AED. Clear 3-metre radius. Call 108. Prepare crash cart if available.',
  },
  'Security Breach': {
    high: ['Weapon', 'Gun', 'Aggressive', 'Theft', 'Break-in', 'Intruder'],
    instructions: 'Lock your door. Stay out of sight. Keep noise to a minimum. If safe, monitor the door until security arrives.',
    suggestedResponse: 'Dispatch security personnel. Lock down affected floor. Review CCTV. Notify law enforcement if weapon is involved.',
  },
  'Maintenance Issue': {
    high: ['Flood', 'Electrical spark', 'Falling', 'Ceiling'],
    instructions: 'Move away from the affected area. Avoid contact with water if electrical sparks are present. Staff are on the way.',
    suggestedResponse: 'Dispatch maintenance crew with safety kit. Rope off affected zone. Cut power if electrical hazard is confirmed.',
  },
  default: {
    instructions: 'Stay calm and wait for staff. If the situation changes, please update your report.',
    suggestedResponse: 'Assign nearest available staff member to assess and respond.',
  },
};

/**
 * Calls Gemini API for AI-powered triage analysis.
 */
async function callGeminiTriage(description, type, domain) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are an emergency response AI for a ${domain} facility.
Analyze this incident report and respond ONLY with a valid JSON object — no markdown, no explanation.

Note:
- Severity 1-3: Minor/trivial issues (e.g., empty coffee dispenser, out of paper towels, minor mess).
- Severity 4-6: Moderate issues (e.g., small spills, non-critical maintenance, technical glitches).
- Severity 7-10: Critical emergencies (e.g., fire, medical, security threats, major leaks).

Incident Type: ${type}
Description: ${description}

Respond with this exact JSON structure:
{
  "severityScore": <integer 1-10, where 10 is most critical>,
  "sentiment": "<one of: Minor | Concerned | Urgent | Critical>",
  "instructions": "<2-3 sentence first-aid / safety instructions for the person in distress, or simple acknowledgement for minor issues>",
  "suggestedResponse": "<2-3 sentence protocol recommendation for the responding staff member>"
}`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  // More resilient JSON extraction
  let clean = text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    clean = jsonMatch[0];
  } else {
    // Strip markdown code fences if present as fallback
    clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  try {
    const parsed = JSON.parse(clean);

    // Validate and clamp
    return {
      severityScore: Math.min(10, Math.max(1, parseInt(parsed.severityScore) || 5)),
      sentiment: ['Minor', 'Concerned', 'Urgent', 'Critical'].includes(parsed.sentiment) ? parsed.sentiment : 'Concerned',
      instructions: parsed.instructions || TRIAGE_DATABASE.default.instructions,
      suggestedResponse: parsed.suggestedResponse || TRIAGE_DATABASE.default.suggestedResponse,
    };
  } catch (parseErr) {
    console.error('[AI Triage] JSON Parse Error from Gemini:', parseErr.message, 'Raw text:', text);
    throw new Error('Invalid AI response format');
  }
}

/**
 * Heuristic fallback triage analysis.
 */
function heuristicTriage(description, type) {
  const text = description.toLowerCase();
  let severity = SEVERITY_LEVELS.MEDIUM;

  const typeData = TRIAGE_DATABASE[type] || TRIAGE_DATABASE.default;
  const highKeywords = typeData.high || [];

  const matchesHigh = highKeywords.some((kw) => text.includes(kw.toLowerCase()));

  if (matchesHigh || text.length > 200 || text.includes('help') || text.includes('emergency')) {
    severity = SEVERITY_LEVELS.HIGH;
  } else if (text.length < 30 || text.includes('coffee') || text.includes('paper towel') || text.includes('soap')) {
    severity = SEVERITY_LEVELS.LOW;
  }

  return {
    severityScore: severity.score,
    sentiment: severity.sentiment,
    instructions: typeData.instructions || TRIAGE_DATABASE.default.instructions,
    suggestedResponse: typeData.suggestedResponse || TRIAGE_DATABASE.default.suggestedResponse,
  };
}

/**
 * Main export — tries Gemini, falls back to heuristics.
 * @param {string} description
 * @param {string} type
 * @param {string} domain
 * @returns {{ severityScore, sentiment, instructions, suggestedResponse }}
 */
async function analyzeIncident(description, type, domain = 'HOSPITAL') {
  if (process.env.GEMINI_API_KEY) {
    try {
      const result = await callGeminiTriage(description, type, domain);
      console.log(`[AI Triage] Gemini analysis complete — severity ${result.severityScore}`);
      return result;
    } catch (err) {
      console.warn('[AI Triage] Gemini call failed, falling back to heuristics:', err.message);
    }
  }
  return heuristicTriage(description, type);
}

module.exports = { analyzeIncident };
