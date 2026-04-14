/**
 * logic.js - Core Business Logic
 * Contains pure functions for scoring, routing, and optimization.
 */

/**
 * Calculates a performance score for a specific facility.
 * Lower score = Better option.
 * Formula: (Wait Time * 0.5) + (Distance * 0.3) + (Crowd Level Weight * 0.2)
 */
export function calculateFacilityScore(item) {
  const crowdWeights = { high: 50, med: 25, low: 10 };
  const crowdVal = crowdWeights[item.level] || 10;
  
  // Normalize distance impact for internal stadium scales (e.g. 100-500m)
  const normalizedDist = item.dist / 10; 

  const score = (item.wait * 0.5) + (normalizedDist * 0.3) + (crowdVal * 0.2);
  return { ...item, score: parseFloat(score.toFixed(1)) };
}

/**
 * Sorts items by their efficiency score and returns the optimal choice.
 */
export function findOptimalOption(options) {
  if (!options || options.length === 0) return null;
  const scored = options.map(calculateFacilityScore);
  return scored.sort((a, b) => a.score - b.score)[0];
}

/**
 * Logic to detemine which teams should handle a specific event intent.
 * Used as a fallback when AI is unavailable or for validation.
 */
export function getRequiredTeamsForEvent(type) {
  const mapping = {
    fire: ['fire', 'police'],
    medical: ['medical'],
    crowd: ['police'],
    lost: ['police'],
    security: ['police'],
    assistance: ['medical', 'police']
  };
  return mapping[type] || ['police'];
}

/**
 * Validates a location string to ensure it exists within the stadium logic.
 */
export function validateLocation(loc) {
  if (!loc) return "Unknown Area";
  const clean = loc.toLowerCase();
  if (clean.includes('section') || clean.includes('gate')) return loc;
  return `${loc} (Unverified Area)`;
}
