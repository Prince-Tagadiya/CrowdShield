/**
 * CrowdShield - Central Data Store (Mock)
 * This file contains the initial stadium state, worker identities, 
 * and immutable system constants.
 */

export const GATES = [
  { id: 'ga', name: 'Gate A', level: 'high', wait: 20, dist: 100 },
  { id: 'gb', name: 'Gate B', level: 'med', wait: 10, dist: 300 },
  { id: 'gc', name: 'Gate C', level: 'low', wait: 5, dist: 400 }
];

export const SECTIONS = [
  { id: 's1', name: 'Section 1', density: 'high' },
  { id: 's2', name: 'Section 2', density: 'med' },
  { id: 's3', name: 'Section 3', density: 'low' }
];

export const WORKERS = [
  { id: 'f1', role: 'fire', name: 'Fire Unit Alpha', x: 20, y: 30, status: 'Ready' },
  { id: 'm1', role: 'medical', name: 'Medic Unit 1', x: 80, y: 70, status: 'Ready' },
  { id: 'p1', role: 'police', name: 'Police Unit 5', x: 50, y: 20, status: 'Patrol' }
];

export const TEAM_ROLES = {
  ADMIN: 'admin',
  FIRE: 'fire',
  MEDICAL: 'medical',
  POLICE: 'police',
  ATTENDEE: 'attendee'
};

// State mapping for role detection based on email prefix
export const ROLE_MAP = {
  'admin': TEAM_ROLES.ADMIN,
  'fire': TEAM_ROLES.FIRE,
  'med': TEAM_ROLES.MEDICAL,
  'pol': TEAM_ROLES.POLICE,
  'user': TEAM_ROLES.ATTENDEE
};

/**
 * Event Metadata used for manual routing or AI grounding
 */
export const EVENT_TYPES = {
  FIRE: { type: 'fire', teams: ['fire', 'police'], icon: '🔥', requireConfirm: true },
  MEDICAL: { type: 'medical', teams: ['medical'], icon: '🚑', requireConfirm: true },
  CROWD: { type: 'crowd', teams: ['police'], icon: '⚠️', requireConfirm: false },
  LOST: { type: 'lost', teams: ['police'], icon: '🔍', requireConfirm: false }
};
