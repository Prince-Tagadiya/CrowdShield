/**
 * data.js — Central Data Store
 * 
 * Purpose: Single source of truth for all simulation data,
 *          constants, and role definitions.
 * 
 * Note: In production, this data would come from Firebase Firestore.
 *       The structure is designed to be a 1:1 mapping with Firestore documents.
 */

// --- STADIUM FACILITIES --- //

/** Gate objects with real-time crowd metrics */
export const GATES = [
  { id: 'ga', name: 'Gate A', level: 'high', wait: 20, dist: 100 },
  { id: 'gb', name: 'Gate B', level: 'med',  wait: 10, dist: 300 },
  { id: 'gc', name: 'Gate C', level: 'low',  wait: 5,  dist: 400 }
];

/** Stadium sections with density indicators */
export const SECTIONS = [
  { id: 's1', name: 'Section 1', density: 'high' },
  { id: 's2', name: 'Section 2', density: 'med' },
  { id: 's3', name: 'Section 3', density: 'low' }
];

/** Active field workers with positions (percentage-based coordinates) */
export const WORKERS = [
  { id: 'f1', role: 'fire',    name: 'Fire Unit Alpha', x: 20, y: 30, status: 'Ready' },
  { id: 'm1', role: 'medical', name: 'Medic Unit 1',    x: 80, y: 70, status: 'Ready' },
  { id: 'p1', role: 'police',  name: 'Police Unit 5',   x: 50, y: 20, status: 'Patrol' }
];

// --- ROLE SYSTEM --- //

/** Enum of all system roles */
export const TEAM_ROLES = {
  ADMIN:    'admin',
  FIRE:     'fire',
  MEDICAL:  'medical',
  POLICE:   'police',
  ATTENDEE: 'attendee'
};

/** Maps email prefix → system role for demo login */
export const ROLE_MAP = {
  'admin': TEAM_ROLES.ADMIN,
  'fire':  TEAM_ROLES.FIRE,
  'med':   TEAM_ROLES.MEDICAL,
  'pol':   TEAM_ROLES.POLICE,
  'user':  TEAM_ROLES.ATTENDEE
};

/** Demo emails that bypass Firebase Auth */
export const DEMO_EMAILS = [
  'admin@test.com', 'fire@test.com', 'med@test.com',
  'pol@test.com', 'user@test.com'
];

// --- EVENT DEFINITIONS --- //

/**
 * Maps event types to their default team assignments and behavior.
 * Used as fallback when AI is offline.
 */
export const EVENT_TYPES = {
  fire:    { teams: ['fire', 'police'],  icon: '🔥', critical: true },
  medical: { teams: ['medical'],         icon: '🚑', critical: true },
  crowd:   { teams: ['police'],          icon: '⚠️', critical: false },
  lost:    { teams: ['police'],          icon: '🔍', critical: false }
};
