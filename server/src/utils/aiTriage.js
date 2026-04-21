/**
 * C.O.R.E. AI Triage Utility
 * 
 * In a production environment, this would integrate with an LLM 
 * (OpenAI, Groq, Vertex AI) to provide nuanced analysis.
 * For this version, it uses advanced heuristic analysis to simulate 
 * AI-driven triage and provide high-fidelity demonstrations.
 */

const SEVERITY_LEVELS = {
  LOW: { score: 2, sentiment: "Concerned" },
  MEDIUM: { score: 5, sentiment: "Urgent" },
  HIGH: { score: 9, sentiment: "Critical" },
};

const TRIAGE_DATABASE = {
  'Fire': {
    high: ["Smell of gas", "Trapped", "Explosion", "Out of control", "Basement"],
    instructions: "Evacuate immediately. Do not use elevators. If safe, pull the nearest manual fire alarm station. Wait for rescue team outside.",
  },
  'Medical Emergency': {
    high: ["Chest pain", "Unconscious", "Seizure", "Choking", "Stroke", "Heavy bleeding", "Breathing"],
    instructions: "Lay the person flat. If unconscious, check pulse. Do not give water. Clear the area for medical staff arrival.",
  },
  'Security Breach': {
    high: ["Weapon", "Gun", "Aggressive", "Theft", "Break-in", "Intruder"],
    instructions: "Lock your door. Stay out of sight. Keep noise to a minimum. If safe, monitor the door until security arrives.",
  },
  'Maintenance Issue': {
    high: ["Flood", "Electrical spark", "Falling", "Ceiling"],
    instructions: "Move away from the affected area. Avoid contact with water if electrical sparks are present. Staff are on the way.",
  },
  'default': {
    instructions: "Stay calm and wait for staff. If the situation changes, please update your report.",
  }
};

/**
 * Analyzes an incident description and provides AI triage metadata.
 * @param {string} description 
 * @param {string} type 
 * @returns {object} { severityScore, sentiment, instructions }
 */
async function analyzeIncident(description, type) {
  const text = description.toLowerCase();
  let severity = SEVERITY_LEVELS.MEDIUM;
  
  // Logic to determine higher severity based on keywords
  const typeData = TRIAGE_DATABASE[type] || TRIAGE_DATABASE.default;
  const highKeywords = typeData.high || [];
  
  const matchesHigh = highKeywords.some(kw => text.includes(kw.toLowerCase()));
  
  if (matchesHigh || text.length > 200 || text.includes('help') || text.includes('emergency')) {
    severity = SEVERITY_LEVELS.HIGH;
  } else if (text.length < 30) {
    severity = SEVERITY_LEVELS.LOW;
  }

  return {
    severityScore: severity.score,
    sentiment: severity.sentiment,
    instructions: typeData.instructions || TRIAGE_DATABASE.default.instructions
  };
}

module.exports = { analyzeIncident };
