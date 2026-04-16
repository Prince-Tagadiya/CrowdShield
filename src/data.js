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
  { id: 'gc', name: 'Gate C', level: 'low',  wait: 5,  dist: 400 },
  { id: 'gd', name: 'Gate D', level: 'med',  wait: 12, dist: 250 }
];

/** Stadium sections with density indicators */
export const SECTIONS = [
  { id: 's1', name: 'Section 1', density: 'high' },
  { id: 's2', name: 'Section 2', density: 'med' },
  { id: 's3', name: 'Section 3', density: 'low' }
];

/** Exit routes (for "Fastest Exit" queries) */
export const EXITS = [
  { id: 'e1', name: 'North Exit',  level: 'low',  wait: 3,  dist: 150 },
  { id: 'e2', name: 'South Exit',  level: 'high', wait: 15, dist: 80 },
  { id: 'e3', name: 'East Exit',   level: 'med',  wait: 8,  dist: 200 },
  { id: 'e4', name: 'West Exit',   level: 'low',  wait: 4,  dist: 350 }
];

/** Food stalls (for "Find Food" queries) */
export const FOOD_STALLS = [
  { id: 'f1', name: 'Main Food Court', level: 'high', wait: 18, dist: 120 },
  { id: 'f2', name: 'Section 2 Kiosk', level: 'low',  wait: 5,  dist: 250 },
  { id: 'f3', name: 'VIP Lounge Café',  level: 'med',  wait: 8,  dist: 400 },
  { id: 'f4', name: 'East Wing Snacks', level: 'low',  wait: 3,  dist: 300 }
];

/** Washrooms (for "Washroom" queries) */
export const WASHROOMS = [
  { id: 'w1', name: 'North Washroom',    level: 'high', wait: 12, dist: 100 },
  { id: 'w2', name: 'Section 2 Restroom', level: 'low',  wait: 2,  dist: 280 },
  { id: 'w3', name: 'South Washroom',    level: 'med',  wait: 7,  dist: 180 },
  { id: 'w4', name: 'VIP Restroom',      level: 'low',  wait: 1,  dist: 420 }
];

/** Active field workers with positions (percentage-based coordinates) */
export const WORKERS = [
  { id: 'f1', role: 'fire',    name: 'Fire Unit Alpha',   x: 20, y: 30, status: 'Ready' },
  { id: 'f2', role: 'fire',    name: 'Fire Unit Bravo',   x: 75, y: 25, status: 'Ready' },
  { id: 'm1', role: 'medical', name: 'Medic Unit 1',      x: 80, y: 70, status: 'Ready' },
  { id: 'm2', role: 'medical', name: 'Medic Unit 2',      x: 35, y: 65, status: 'Ready' },
  { id: 'p1', role: 'police',  name: 'Police Unit Alpha', x: 50, y: 20, status: 'Patrol' },
  { id: 'p2', role: 'police',  name: 'Police Unit Bravo', x: 60, y: 80, status: 'Patrol' }
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

// --- EVENT DEFINITIONS --- //

/**
 * Maps event types to their default team assignments and behavior.
 * Used as fallback when AI is offline.
 */
export const EVENT_TYPES = {
  fire:    { teams: ['fire', 'police'],  icon: '🔥', critical: true },
  medical: { teams: ['medical'],         icon: '🚑', critical: true },
  crowd:   { teams: ['police'],          icon: '⚠️', critical: false },
  lost_found: { teams: ['police'],          icon: '🔍', critical: false }
};

/** Labels for the attendee guidance buttons */
export const GUIDANCE_MAP = {
  food:     { data: 'FOOD_STALLS',  icon: '🍔', label: 'Food Stall' },
  exit:     { data: 'EXITS',        icon: '🏃', label: 'Exit' },
  washroom: { data: 'WASHROOMS',    icon: '🚻', label: 'Washroom' },
  gate:     { data: 'GATES',        icon: '🚪', label: 'Gate' }
};
