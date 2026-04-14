/**
 * tests.js - Functional Testing Suite for CrowdShield
 * Validates critical logic for scoring and routing.
 */

import { calculateFacilityScore, findOptimalOption, getRequiredTeamsForEvent } from './logic.js';
import { GATES } from './data.js';

export function runAllTests() {
  console.log("%c--- RUNNING CROWDSHIELD TEST SUITE ---", "color: #58a6ff; font-weight: bold;");
  
  testDecisionEngine();
  testAlertRouting();
  
  console.log("%c--- TESTS COMPLETE ---", "color: #58a6ff; font-weight: bold;");
}

function testDecisionEngine() {
  console.log("Testing Decision Engine Logic...");
  
  // Mock abnormal gate to see if it wins
  const mockGates = [
    { id: 'g1', name: 'Gate 1', level: 'high', wait: 50, dist: 500 }, // High wait, far
    { id: 'g2', name: 'Gate 2', level: 'low', wait: 2, dist: 100 }    // Low wait, near (Should Win)
  ];
  
  const best = findOptimalOption(mockGates);
  
  if (best.id === 'g2') {
    console.log("✅ Test Passed: Optimal gate selected correctly based on wait time and distance.");
  } else {
    console.error("❌ Test Failed: Decision engine selected suboptimal gate.", best);
  }
}

function testAlertRouting() {
  console.log("Testing Alert Routing Logic...");
  
  const fireTeams = getRequiredTeamsForEvent('fire');
  const firePassed = fireTeams.includes('fire') && fireTeams.includes('police');
  
  const medTeams = getRequiredTeamsForEvent('medical');
  const medPassed = medTeams.includes('medical') && !medTeams.includes('fire');
  
  if (firePassed && medPassed) {
    console.log("✅ Test Passed: Alerts routed to correct team combinations.");
  } else {
    console.error("❌ Test Failed: Alert routing logic returned incorrect teams.");
  }
}
