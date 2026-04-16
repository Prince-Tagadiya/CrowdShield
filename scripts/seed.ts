/**
 * VenueFlow Seed Script
 * Populates Firebase Realtime Database with 6 realistic zones for
 * Wankhede Stadium, Mumbai. Run once after Firebase setup.
 *
 * Usage: npm run seed (from project root)
 * Requires: FIREBASE_SERVICE_ACCOUNT_BASE64, FIREBASE_DATABASE_URL env vars
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars from .env in parent directory
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const base64SA = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
const dbURL = process.env.FIREBASE_DATABASE_URL;

if (!base64SA || !dbURL) {
  console.error('❌ Missing env vars. Set FIREBASE_SERVICE_ACCOUNT_BASE64 and FIREBASE_DATABASE_URL');
  process.exit(1);
}

const serviceAccount = JSON.parse(Buffer.from(base64SA, 'base64').toString('utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: dbURL,
});

const db = admin.database();

/**
 * Wankhede Stadium zone layout:
 *
 *            North Stand Entry
 *           /        |        \
 *     Garware     [field]    East Stand
 *    Pavilion                Food Court
 *          \        |         /
 *           \       |        /
 *    West Stand            Sachin Tendulkar
 *    Food Court            Stand Restrooms
 *           \       |       /
 *            South Stand Entry
 *
 * All zones connected for Dijkstra navigation graph.
 */

interface ZoneData {
  name: string;
  type: string;
  capacity: number;
  currentOccupancy: number;
  coordinates: { lat: number; lng: number };
  adjacentZones: string[];
}

const zones: Record<string, ZoneData> = {
  'zone-north-entry': {
    name: 'North Stand Entry (Gate A)',
    type: 'entry',
    capacity: 8000,
    currentOccupancy: 3200, // 40% — clear
    coordinates: { lat: 18.9394712, lng: 72.8262613 }, // User-provided North Stand
    adjacentZones: ['zone-east-food', 'zone-west-food', 'zone-garware'],
  },
  'zone-south-entry': {
    name: 'South Stand Entry (Gate D)',
    type: 'entry',
    capacity: 7000,
    currentOccupancy: 5250, // 75% — crowded
    coordinates: { lat: 18.9380028, lng: 72.825764 }, // Derived: Just south of Stadium Center
    adjacentZones: ['zone-east-food', 'zone-west-food', 'zone-sachin'],
  },
  'zone-east-food': {
    name: 'East Stand Food Court',
    type: 'concession',
    capacity: 3000,
    currentOccupancy: 1800, // 60% — moderate
    coordinates: { lat: 18.9388528, lng: 72.826764 }, // East perimeter parallel to center
    adjacentZones: ['zone-north-entry', 'zone-south-entry', 'zone-garware', 'zone-sachin'],
  },
  'zone-west-food': {
    name: 'West Stand Food Court',
    type: 'concession',
    capacity: 2500,
    currentOccupancy: 2125, // 85% — critical
    coordinates: { lat: 18.9388528, lng: 72.824764 }, // West perimeter parallel to center
    adjacentZones: ['zone-north-entry', 'zone-south-entry', 'zone-garware', 'zone-sachin'],
  },
  'zone-garware': {
    name: 'Garware Pavilion Restrooms',
    type: 'restroom',
    capacity: 1500,
    currentOccupancy: 750, // 50% — moderate
    coordinates: { lat: 18.9376962, lng: 72.825283 }, // User-provided Garware Club House
    adjacentZones: ['zone-north-entry', 'zone-east-food', 'zone-west-food', 'zone-sachin'],
  },
  'zone-sachin': {
    name: 'Sachin Tendulkar Stand Restrooms',
    type: 'restroom',
    capacity: 1200,
    currentOccupancy: 1080, // 90% — critical
    coordinates: { lat: 18.9395695, lng: 72.8253287 }, // User-provided Sachin Tendulkar Stand
    adjacentZones: ['zone-south-entry', 'zone-east-food', 'zone-west-food', 'zone-garware'],
  },
};

/** Derive status from occupancy ratio */
function deriveStatus(occ: number, cap: number): string {
  const ratio = occ / cap;
  if (ratio < 0.4) return 'clear';
  if (ratio < 0.65) return 'moderate';
  if (ratio < 0.85) return 'crowded';
  return 'critical';
}

/** Estimate wait time */
function estimateWait(occ: number, cap: number, type: string): number {
  const baseWaits: Record<string, number> = { entry: 5, concession: 8, restroom: 6, seating: 2, medical: 10 };
  const ratio = Math.min(occ / cap, 1);
  return Math.round((baseWaits[type] ?? 5) * Math.pow(ratio, 1.5));
}

async function seed() {
  console.log('🏟️  Seeding Wankhede Stadium zones...\n');

  const updates: Record<string, unknown> = {};
  const now = Date.now();

  for (const [id, zone] of Object.entries(zones)) {
    const status = deriveStatus(zone.currentOccupancy, zone.capacity);
    const waitTime = estimateWait(zone.currentOccupancy, zone.capacity, zone.type);
    const pct = Math.round((zone.currentOccupancy / zone.capacity) * 100);

    updates[`zones/${id}`] = {
      ...zone,
      status,
      waitTimeMinutes: waitTime,
      lastUpdated: now,
      updatedBy: 'seed-script',
    };

    console.log(`  ${status === 'critical' ? '🔴' : status === 'crowded' ? '🟠' : status === 'moderate' ? '🟡' : '🟢'} ${zone.name}`);
    console.log(`     ${zone.currentOccupancy}/${zone.capacity} (${pct}%) → ${status}, ~${waitTime} min wait`);
  }

  // Also seed a sample alert
  const alertId = 'alert-seed-1';
  updates[`alerts/${alertId}`] = {
    zoneId: 'zone-sachin',
    type: 'overcrowding',
    severity: 'high',
    description: 'Sachin Tendulkar Stand restrooms at 90% capacity. Queue extending into walkway.',
    status: 'active',
    createdBy: 'seed-script',
    createdAt: now,
    resolvedAt: null,
    resolvedBy: null,
  };

  console.log('\n  🚨 Sample alert: Overcrowding at Sachin Tendulkar Stand Restrooms');

  await db.ref().update(updates);

  console.log('\n✅ Seed complete! 6 zones + 1 alert written to Firebase RTDB.');
  console.log('   You can now start the app and see realistic data.\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
