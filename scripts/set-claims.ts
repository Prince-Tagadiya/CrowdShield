/**
 * One-time script: Set custom claims on your staff user.
 * This gives the user the "staff" role needed to access the dashboard.
 *
 * Usage: npx ts-node set-claims.ts
 * Run AFTER you've created a .env file with Firebase credentials.
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const base64SA = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
const dbURL = process.env.FIREBASE_DATABASE_URL;

if (!base64SA || !dbURL) {
  console.error('❌ Missing env vars. Create a .env file first (see README).');
  process.exit(1);
}

const serviceAccount = JSON.parse(Buffer.from(base64SA, 'base64').toString('utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: dbURL,
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✏️  CHANGE THIS to the email you created in Firebase Auth
const STAFF_EMAIL = 'staff@venueflow.app';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function setClaims() {
  console.log(`Setting staff role for: ${STAFF_EMAIL}...`);

  const user = await admin.auth().getUserByEmail(STAFF_EMAIL);
  await admin.auth().setCustomUserClaims(user.uid, { role: 'staff' });

  console.log(`✅ Staff role set for ${STAFF_EMAIL} (UID: ${user.uid})`);
  console.log('   This user can now log into the Staff Dashboard.');
  process.exit(0);
}

setClaims().catch((err) => {
  console.error('❌ Failed to set claims:', err.message);
  process.exit(1);
});
