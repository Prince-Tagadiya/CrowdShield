import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'crowdshield-3912c';
const source = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const accessToken = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();

async function createRuleset() {
  const response = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': projectId,
    },
    body: JSON.stringify({
      source: {
        files: [
          {
            name: 'firestore.rules',
            content: source,
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ruleset creation failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function releaseRules(rulesetName) {
  const releaseName = `projects/${projectId}/releases/cloud.firestore`;
  let response = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': projectId,
    },
    body: JSON.stringify({
      name: releaseName,
      rulesetName,
    }),
  });

  if (response.ok) {
    return response.json();
  }

  const errorBody = await response.text();
  if (!errorBody.includes('already exists')) {
    response = await fetch(`https://firebaserules.googleapis.com/v1/${releaseName}?updateMask=ruleset_name`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Goog-User-Project': projectId,
      },
      body: JSON.stringify({
        release: {
          name: releaseName,
          rulesetName,
        },
        updateMask: 'rulesetName',
      }),
    });

    if (response.ok) {
      return response.json();
    }

    throw new Error(`Release update failed: ${response.status} ${await response.text()}`);
  }

  response = await fetch(`https://firebaserules.googleapis.com/v1/${releaseName}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': projectId,
    },
    body: JSON.stringify({
      release: {
        name: releaseName,
        rulesetName,
      },
      updateMask: 'rulesetName',
    }),
  });

  if (!response.ok) {
    throw new Error(`Release update failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

const ruleset = await createRuleset();
const release = await releaseRules(ruleset.name);

console.log(JSON.stringify({
  projectId,
  ruleset: ruleset.name,
  release: release.name,
}, null, 2));
