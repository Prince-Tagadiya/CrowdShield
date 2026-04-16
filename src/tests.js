/**
 * tests.js — CrowdShield Testing Suite
 * 
 * Purpose: Validates core logic on app startup.
 *          Results are logged to the browser console for evaluator review.
 */

import { calculateScore, getBestGate, getBestExit, getBestFood, getBestWashroom, getTeamsForEvent, validateLocation } from './decision.js';
import { routeAlert } from './alert.js';
import { buildFallbackResponse } from './ai.js';

let passed = 0, failed = 0;

/** Helper: logs pass/fail status */
function assert(label, condition) {
  if (condition) {
    console.log(`✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${label}`);
    failed++;
  }
}

/**
 * Tests the decision engine scoring formula.
 */
function testDecisionEngine() {
  console.log('%c[Test] Decision Engine', 'font-weight:bold');

  // Test 1: Best gate selection
  const gates = [
    { id: 'g1', name: 'Bad Gate',  level: 'high', wait: 50, dist: 500 },
    { id: 'g2', name: 'Good Gate', level: 'low',  wait: 2,  dist: 100 }
  ];
  const best = getBestGate(gates);
  assert('Best gate selected correctly (lowest score wins)', best?.id === 'g2');

  // Test 2: Score is valid number
  const score = calculateScore(gates[0]);
  assert('Score is a valid positive number', typeof score.score === 'number' && score.score > 0);

  // Test 3: Each guidance function returns a result
  assert('getBestExit returns a result', getBestExit() !== null);
  assert('getBestFood returns a result', getBestFood() !== null);
  assert('getBestWashroom returns a result', getBestWashroom() !== null);

  // Test 4: Empty array returns null
  assert('Empty array returns null', getBestGate([]) === null);
}

/**
 * Tests that event types map to the correct team combinations.
 */
function testAlertRouting() {
  console.log('%c[Test] Alert Routing', 'font-weight:bold');

  const fireTeams = getTeamsForEvent('fire');
  assert('Fire routes to fire + police', fireTeams.includes('fire') && fireTeams.includes('police'));

  const medTeams = getTeamsForEvent('medical');
  assert('Medical routes to medical only', medTeams.includes('medical') && !medTeams.includes('fire'));

  const unknownTeams = getTeamsForEvent('xyz');
  assert('Unknown event defaults to police', unknownTeams.includes('police'));

  // Test routeAlert function
  const routed = routeAlert({ intent: 'fire', location: 'Gate A', teams: [], response: 'Test' });
  assert('routeAlert fills team for fire', routed.teams.includes('fire') && routed.teams.includes('police'));
  assert('routeAlert sets status to pending', routed.status === 'pending');
}

/**
 * Tests AI response parsing / fallback.
 */
function testAIParsing() {
  console.log('%c[Test] AI Parsing (Fallback)', 'font-weight:bold');

  const fireResult = buildFallbackResponse('There is a fire in section 2');
  assert('Fire input → fire intent', fireResult.intent === 'fire');
  assert('Fire input → isCritical true', fireResult.isCritical === true);
  assert('Fire input → includes fire team', fireResult.teams.includes('fire'));

  const medResult = buildFallbackResponse('Someone fainted near gate B');
  assert('Medical input → medical intent', medResult.intent === 'medical');

  const lostResult = buildFallbackResponse('I lost my child');
  assert('Lost input → lost_found intent', lostResult.intent === 'lost_found');
  assert('Lost input → not critical', lostResult.isCritical === false);

  const emptyResult = buildFallbackResponse('');
  assert('Empty input → defaults to crowd', emptyResult.intent === 'crowd');
}

/**
 * Tests input validation and sanitization.
 */
function testInputValidation() {
  console.log('%c[Test] Input Validation', 'font-weight:bold');

  assert('Empty string returns fallback', validateLocation('') === 'Unknown Area');
  assert('Null returns fallback', validateLocation(null) === 'Unknown Area');
  assert('Valid location passes through', validateLocation('Gate A').includes('Gate A'));
  assert('HTML stripped from input', !validateLocation('<script>alert</script>').includes('<'));
}

/**
 * Runs the full test suite and prints summary.
 */
export function runAllTests() {
  passed = 0;
  failed = 0;

  console.log('%c━━━ CROWDSHIELD TEST SUITE ━━━', 'color:#58a6ff; font-weight:bold; font-size:14px');

  try {
    testDecisionEngine();
    testAlertRouting();
    testAIParsing();
    testInputValidation();
  } catch (err) {
    console.error('[Test] Unexpected error:', err);
    failed++;
  }

  const color = failed === 0 ? '#3fb950' : '#f85149';
  console.log(`%c━━━ RESULTS: ${passed} passed, ${failed} failed ━━━`, `color:${color}; font-weight:bold; font-size:14px`);

  return { passed, failed };
}
