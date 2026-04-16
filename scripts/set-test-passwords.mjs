import { execSync } from 'child_process';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'crowdshield-3912c';
const password = process.env.TEST_ACCOUNT_PASSWORD || 'CrowdShield123!';
const emails = ['admin@test.com', 'fire@test.com', 'med@test.com', 'pol@test.com', 'user@test.com'];

function getAccessToken() {
  return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
}

async function lookupUserByEmail(email, accessToken) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': projectId,
    },
    body: JSON.stringify({ email: [email] }),
  });

  if (!response.ok) {
    throw new Error(`Lookup failed for ${email}: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.users?.[0] || null;
}

async function updatePassword(localId, accessToken) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': projectId,
    },
    body: JSON.stringify({
      localId,
      password,
    }),
  });

  if (!response.ok) {
    throw new Error(`Password update failed for ${localId}: ${response.status} ${await response.text()}`);
  }
}

const accessToken = getAccessToken();
const results = [];

for (const email of emails) {
  try {
    const user = await lookupUserByEmail(email, accessToken);
    if (!user?.localId) {
      results.push({ email, status: 'skipped', reason: 'user-not-found' });
      continue;
    }

    await updatePassword(user.localId, accessToken);
    results.push({ email, status: 'updated', password });
  } catch (error) {
    results.push({ email, status: 'error', error: error instanceof Error ? error.message : String(error) });
  }
}

console.log(JSON.stringify({ projectId, password, results }, null, 2));
