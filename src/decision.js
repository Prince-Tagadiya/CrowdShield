/**
 * decision.js — Decision Engine
 * 
 * Purpose: Pure mathematical functions for scoring facilities
 *          and determining optimal routes. No side effects.
 * 
 * Scoring Formula: score = (waitTime * 0.5) + (distance * 0.3) + (crowdLevel * 0.2)
 * Lower score = Better option.
 */

import { GATES, EXITS, FOOD_STALLS, WASHROOMS } from './data.js';

/** Weight map for crowd density levels */
const CROWD_WEIGHTS = { high: 50, med: 25, low: 10 };

/**
 * Calculates an efficiency score for a single facility.
 * @param {object} item - A gate/exit/stall with { wait, dist, level }
 * @returns {object} - The item with an appended `score` property
 */
export function calculateScore(item) {
  const crowdVal = CROWD_WEIGHTS[item.level] || 10;
  const normalizedDist = item.dist / 10;
  const score = (item.wait * 0.5) + (normalizedDist * 0.3) + (crowdVal * 0.2);
  return { ...item, score: parseFloat(score.toFixed(1)) };
}

/**
 * Finds the best option from a list of facilities.
 * @param {Array} options - Array of facility objects
 * @returns {object|null} - The facility with the lowest score
 */
export function getBestOption(options) {
  if (!options || options.length === 0) return null;
  return options.map(calculateScore).sort((a, b) => a.score - b.score)[0];
}

/**
 * Finds the least crowded gate.
 * @param {Array} [gateOverride] - Optional gate array (for live data)
 * @returns {object|null}
 */
export function getBestGate(gateOverride) {
  return getBestOption(gateOverride || GATES);
}

/**
 * Finds the fastest exit route.
 * @returns {object|null}
 */
export function getBestExit() {
  return getBestOption(EXITS);
}

/**
 * Finds the best food stall (lowest wait + closest).
 * @returns {object|null}
 */
export function getBestFood() {
  return getBestOption(FOOD_STALLS);
}

/**
 * Finds the best washroom.
 * @returns {object|null}
 */
export function getBestWashroom() {
  return getBestOption(WASHROOMS);
}

/**
 * Returns the teams that should handle a given event type.
 * Used as fallback routing when AI is unavailable.
 * @param {string} type - Event type (fire, medical, crowd, lost)
 * @returns {string[]} - Array of team role strings
 */
export function getTeamsForEvent(type) {
  const map = {
    fire:     ['fire', 'police'],
    medical:  ['medical'],
    crowd:    ['police'],
    lost:     ['police'],
    security: ['police']
  };
  return map[type] || ['police'];
}

/**
 * Sanitizes and validates a location string.
 * @param {string} loc - Raw location input
 * @returns {string} - Cleaned location or fallback
 */
export function validateLocation(loc) {
  if (!loc || typeof loc !== 'string') return 'Unknown Area';
  const clean = loc.trim().replace(/[<>]/g, '');
  if (clean.length === 0) return 'Unknown Area';
  return clean;
}
