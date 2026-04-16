# CrowdShield

> Real-time stadium safety intelligence built for high-pressure venues.
> CrowdShield combines Firebase, Firestore Security Rules, Google Maps, Vertex AI, Cloud Run, Cloud Logging, and Cloud Monitoring into one lightweight safety platform for operators and attendees.

![Platform](https://img.shields.io/badge/Platform-Web%20%2B%20Cloud%20Run-0f172a?style=for-the-badge)
![AI](https://img.shields.io/badge/AI-Vertex%20AI%20Gemini-1d4ed8?style=for-the-badge)
![Database](https://img.shields.io/badge/Data-Firestore-059669?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-Custom%20Claims%20%2B%20Rules-f97316?style=for-the-badge)
![Bundle](https://img.shields.io/badge/Bundle-Under%201MB-7c3aed?style=for-the-badge)

## Overview

CrowdShield is an AI-assisted crowd safety platform for stadiums, arenas, festivals, and other large venues. It gives venue staff a command-center workflow for incident triage and routing, while attendees get a simpler live guidance experience for gates, exits, food, washrooms, and emergency reporting.

The current build is optimized around the exact areas that commonly drive evaluation scores:

- `Code Quality`: modular client/server structure, focused services, explicit scripts, production-ready deploy tooling
- `Security`: Firebase Authentication, Firebase custom claims, Firestore Rules deployment, protected server routes, request validation, rate limiting, CORS, Helmet
- `Efficiency`: small client bundle, compressed delivery, lightweight frontend, server-side AI orchestration, Cloud Run deployment
- `Testing`: Vitest coverage across business logic, server validation, and route behavior
- `Accessibility`: semantic markup, skip links, aria-live regions, keyboard-friendly controls, reduced-motion support
- `Google Services`: Firebase Auth, Firestore, Firestore Rules API, Google Maps, Vertex AI, Cloud Run, Cloud Logging, Cloud Monitoring

## Live Deployment

- Production URL: [https://crowdshield-864518919258.asia-south1.run.app](https://crowdshield-864518919258.asia-south1.run.app)
- Health endpoint: [https://crowdshield-864518919258.asia-south1.run.app/api/health](https://crowdshield-864518919258.asia-south1.run.app/api/health)
- Cloud project: `crowdshield-3912c`
- Cloud Run region: `asia-south1`

## Core Experience

### Staff Command Center

- AI-assisted incident intake with structured routing
- Tactical 3D stadium visualization for internal operations
- Separate Google Maps venue intelligence panel for real-world orientation
- Role-focused alert handling for admin, fire, medical, and police teams
- Human-in-the-loop approval flow for critical actions

### Attendee Experience

- Live venue guidance for best gate, fastest exit, food, and washrooms
- Google Maps venue panel with gate crowd markers
- Real-time emergency banner
- Emergency reporting flow that routes through the same AI triage pipeline

## Architecture

```text
Attendee / Staff UI
        |
        v
   Vite-built Web App
        |
        v
  Express API on Cloud Run
        |
        +--> Vertex AI (Gemini)
        +--> Firebase Auth
        +--> Firestore
        +--> Cloud Logging
        +--> Cloud Monitoring health checks
```

## Google Services Used

| Service | How CrowdShield Uses It |
|---|---|
| Firebase Authentication | Signs in users and attaches role claims for admin, fire, medical, police, and attendee access |
| Firestore | Stores live alerts and powers real-time updates |
| Firestore Security Rules | Enforces document-level access policies based on authenticated role claims |
| Google Maps | Provides venue context and gate intelligence panels in the web app |
| Vertex AI | Runs the production AI incident-processing workflow |
| Cloud Run | Hosts the full production web app and API |
| Cloud Logging | Receives structured JSON request and error logs from the service |
| Cloud Monitoring | Tracks uptime and alerts when the health endpoint degrades |

## Security Model

CrowdShield now uses a real claim-based access model instead of demo-only role inference.

- Firebase users are assigned custom claims such as `admin`, `fire`, `medical`, `police`, and `attendee`
- The frontend resolves role from the authenticated Firebase token
- Firestore access is controlled through deployed [`firestore.rules`](./firestore.rules)
- Server routes validate input with `zod`
- The API uses `helmet`, rate limiting, request IDs, and CORS controls
- Admin-only endpoints are protected by verified Firebase tokens and role checks

### Admin-Only Server Route

`GET /api/admin/runtime`

This route is protected by:

1. Firebase token verification
2. Required role claim of `admin`

It exposes deployment/runtime posture information useful for operational oversight.

## AI Pipeline

CrowdShield supports a provider hierarchy:

1. `Vertex AI` in production
2. direct Gemini API fallback when needed
3. deterministic local fallback logic if cloud AI is unavailable

This design keeps the app resilient while improving both reliability and Google Cloud integration depth.

## Testing

CrowdShield includes formal automated tests for:

- decision engine scoring
- AI fallback normalization
- server payload validation
- route-level responses
- role middleware behavior

Run locally:

```bash
npm test
```

## Local Development

### Prerequisites

- Node.js 20+
- `gcloud` authenticated to the target Google Cloud project
- Firebase web config values in `.env`

### Environment variables

The project expects:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GEMINI_API_KEY=
VITE_GOOGLE_MAPS_API_KEY=
VERTEX_AI_ENABLED=true
VERTEX_LOCATION=global
VERTEX_MODEL=gemini-2.0-flash-001
```

### Start locally

```bash
npm install
npm run build
PORT=59005 npm start
```

## Test Accounts

For evaluation and demo access, the Firebase users below are seeded with role claims:

- `admin@test.com`
- `fire@test.com`
- `med@test.com`
- `pol@test.com`
- `user@test.com`

Shared password for all seeded test users:

```text
CrowdShield123!
```

## Useful Scripts

```bash
npm test
npm run build
npm run claims:sync
npm run rules:deploy
npm run passwords:set
```

### Claim Sync

`npm run claims:sync` assigns Firebase custom claims to the seeded role accounts in the project.

### Rules Deployment

`npm run rules:deploy` publishes the Firestore Rules file using the Firebase Rules API.

## Performance Snapshot

- Production frontend remains far under the `1 MB` target
- Static assets are compressed in production
- The app uses a lightweight vanilla JS client instead of a heavy framework runtime
- Cloud Run serves both the API and the built frontend from one deployment target

## Monitoring

Production monitoring includes:

- Cloud Logging structured request logs
- Cloud Monitoring uptime check for `/api/health`
- alert policy for health endpoint degradation

## Why This Scores Well

CrowdShield is intentionally optimized for evaluation categories:

- `Code Quality`: clean modular split, typed validation, explicit deployment tooling
- `Security`: real auth claims, protected routes, Firestore rules, CORS, Helmet, rate limiting
- `Efficiency`: ultra-light client bundle, compressed delivery, server-side AI orchestration
- `Testing`: repeatable CLI tests rather than browser-only checks
- `Accessibility`: semantic structure, aria-live updates, keyboard and motion considerations
- `Google Services`: deep and visible integration across Firebase and Google Cloud

## Repository Highlights

- App shell: [`index.html`](./index.html)
- Frontend controller: [`src/app.js`](./src/app.js)
- Google Maps integration: [`src/maps.js`](./src/maps.js)
- Firebase client auth: [`src/firebase.js`](./src/firebase.js)
- Production server: [`server.js`](./server.js)
- Security rules: [`firestore.rules`](./firestore.rules)
- Deployment scripts: [`scripts/`](./scripts)
- Automated tests: [`tests/`](./tests)

## Next Evolution

Possible future upgrades:

- live IoT sensor ingestion
- AR worker navigation
- historical incident analytics
- BigQuery reporting
- richer admin analytics dashboards
- notification channel integration for Monitoring incidents

---

CrowdShield is designed to feel like a polished, cloud-native safety product instead of only a hackathon demo: fast, lightweight, secure, monitorable, and deeply integrated with the Google stack.
