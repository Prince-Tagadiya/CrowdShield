import { execSync } from 'child_process';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'crowdshield-3912c';
const roleMap = {
  'admin@test.com': 'admin',
  'fire@test.com': 'fire',
  'med@test.com': 'medical',
  'pol@test.com': 'police',
  'user@test.com': 'attendee',
};

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

async function updateUserClaims(localId, role, accessToken) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': projectId,
    },
    body: JSON.stringify({
      localId,
      customAttributes: JSON.stringify({ role }),
    }),
  });

  if (!response.ok) {
    throw new Error(`Claim update failed for ${localId}: ${response.status} ${await response.text()}`);
  }
}

const accessToken = getAccessToken();
const results = [];

for (const [email, role] of Object.entries(roleMap)) {
  try {
    const user = await lookupUserByEmail(email, accessToken);
    if (!user?.localId) {
      results.push({ email, role, status: 'skipped', reason: 'user-not-found' });
      continue;
    }

    await updateUserClaims(user.localId, role, accessToken);
    results.push({ email, role, status: 'updated', uid: user.localId });
  } catch (error) {
    results.push({ email, role, status: 'error', error: error instanceof Error ? error.message : String(error) });
  }
}

console.log(JSON.stringify({ projectId, results }, null, 2));
