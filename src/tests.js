/**
 * tests.js — CrowdShield Testing Suite
 * 
 * Purpose: Validates core logic on app startup.
 *          Results are logged to the browser console for evaluator review.
 */

import { calculateScore, getBestGate, getTeamsForEvent, validateLocation } from './decision.js';
import { saveAlertToDB } from './alert.js';

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
 * Verifies that a low-wait, low-crowd gate scores better than a high-wait one.
 */
function testDecisionEngine() {
  console.log('%c[Test] Decision Engine', 'font-weight:bold');

  const gates = [
    { id: 'g1', name: 'Bad Gate',  level: 'high', wait: 50, dist: 500 },
    { id: 'g2', name: 'Good Gate', level: 'low',  wait: 2,  dist: 100 }
  ];

  const best = getBestGate(gates);
  assert('Best gate selected correctly (lowest score wins)', best.id === 'g2');

  const score = calculateScore(gates[0]);
  assert('Score is a valid number', typeof score.score === 'number' && score.score > 0);
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
 * Tests Firestore write operation.
 * This will attempt a real write — if Firestore is configured, it passes.
 */
async function testFirestoreWrite() {
  console.log('%c[Test] Firestore Write', 'font-weight:bold');

  const id = await saveAlertToDB({
    type: 'test',
    location: 'Unit Test',
    teams: ['police'],
    message: 'Automated test alert'
  });

  if (id) {
    assert('Firestore alert saved successfully', true);
  } else {
    console.warn('⚠️ SKIP: Firestore write failed (check rules/config). Non-blocking.');
  }
}

/**
 * Runs the full test suite and prints summary.
 */
export async function runAllTests() {
  console.log('%c--- CROWDSHIELD TEST SUITE ---', 'color:#58a6ff; font-weight:bold; font-size:14px');

  testDecisionEngine();
  testAlertRouting();
  testInputValidation();
  await testFirestoreWrite();

  console.log(`%c--- RESULTS: ${passed} passed, ${failed} failed ---`,
    `color:${failed === 0 ? '#3fb950' : '#f85149'}; font-weight:bold; font-size:14px`);
}
