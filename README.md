# CrowdShield — Real-time Crowd Intelligence Platform

## Overview
CrowdShield is a smart, dynamic assistant and live crowd management platform built for high-pressure venues, specifically implemented for high-capacity stadiums and public campuses.

**Chosen Vertical:** Smart Stadium / Venue Crowd Management

---

## Approach and Logic
Large venues suffer from congestion, delayed response times, and safety risks during peak events. CrowdShield solves this by aggregating real-time occupancy and safety data across defined zones (gates, exits, food courts, restrooms) and exposing this data through two interfaces:

*   **Attendee Interface:** Allows users to see live crowd metrics, find the fastest navigation routes using resource-optimization algorithms, and ask an AI assistant contextual questions about venue safety and status.
*   **Staff Interface:** Provides a tactical Command Center to monitor zones, authorize AI-generated crowd control strategies, and coordinate emergency units (Fire, Medical, Police) in real-time.

---

## Logical Decision Making
*   **Status Derivation:** Zone status (Safe, Warning, High Risk, Critical) and wait times are dynamically derived using mathematical thresholds based on live capacity ratios and movement telemetry.
*   **Resource Optimization:** Navigation and guidance utilize a scoring engine that weights congestion ratio, physical distance, and current safety alerts, naturally routing attendees toward safer, underutilized egress points.
*   **AI Context Grounding:** The Gemini assistant is "Grounding-aware"—it is injected with the live JSON telemetry of the stadium every time a user prompts it, allowing it to provide hyper-accurate, real-time advice instead of generic summaries.

---

## How the Solution Works
*   **Frontend (Vanilla JS + Vite):** Renders the Google Maps tactical overlay, 3D stadium HUD, and the pro-active AI console. Uses a reactive state-subscription model for instant UI updates.
*   **Backend (Node.js + Express):** Handles the Vertex AI/Gemini 2.0 Flash orchestration, tactical alert routing, and the live simulation engine. All server logs are structured via Google Cloud Logging.
*   **Database (Firestore):** Acts as the single source of truth. Updates made in Firestore (either by field staff or via AI approval) are instantly pushed to all connected client devices via push-based listeners.
*   **AI Assistant:** Powered by Gemini 2.0 Flash, the assistant supports three distinct workflows: (1) Attendee safety guidance, (2) Staff tactical recommendations, and (3) Automated incident triage and reasoning.

---

## Google Services Integration
CrowdShield meaningfully integrates 6 Google Cloud services into a cohesive safety stack:

| Service | Integration | Key Files |
|---|---|---|
| **Firebase Authentication** | Role-based login with custom claims (`admin`, `fire`, etc.). Server-side token verification via Admin SDK. | `src/firebase.js`, `server.js` |
| **Firestore** | Push-based WebSocket sync for live telemetry and tactical alerts. Zero-polling architecture. | `src/alert.js`, `src/app.js` |
| **Google Maps JS API** | Satellite tactical view with color-coded congestion markers, interactive InfoWindows, and gate intelligence. | `src/maps.js`, `index.html` |
| **Vertex AI (Gemini)** | Predictive and reasoning engine generating 5-10 min forecasts and logical explanations for each safety action. | `server.js`, `src/ai.js` |
| **Google Cloud Logging** | Structured JSON logging with severity levels (INFO/WARNING/ERROR) replacing all raw logs for observability. | `server.js` |
| **Google Cloud Run** | Fully managed, auto-scaling deployment. Multi-stage Docker build for minimal footprint and fast cold starts. | `Dockerfile`, `server.js` |

---

## Setup & Running Locally
1. Clone the repository.
2. Ensure you have a `.env` file containing Firebase, Gemini, and Google Maps API keys.
3. **Install:** `npm install`
4. **Build & Start:**
```bash
npm run build
PORT=59005 npm start
```
5. **Provision Accounts:** Visit `/setup.html` to instantly seed your project with the required test accounts and roles.

---

## Testing
*   **Framework:** Vitest
*   **Coverage:** Business logic, tactical scoring, AI fallback normalization, and server-side route security.
*   **Suite Highlights:** 40+ tests across 8 test files covering `decision-engine`, `ai-orchestration`, `server-validation`, and `accessibility`.
*   **Run:** `npm test`

---

## Evaluation Focus Areas
*   **Code Quality:** Modular ES Modules architecture, strict typed validation via Zod, structured logging, and zero-lint-suppression policy.
*   **Security:** Firebase Auth custom claims, 3-tier rate limiting, Helmet security headers (CSP), and Firestore Security Rules enforcement.
*   **Efficiency:** Under-1MB client bundle, zero-polling WebSocket sync, compressed delivery, and O(1) state lookups.
*   **Accessibility:** 50+ ARIA attributes, skip links, aria-live status regions, full keyboard tab patterns, and reduced-motion support.
*   **Google Services:** Deep, production-grade integration across the full Google Cloud stack.

---

**Conclusion:** CrowdShield is designed as a production-native safety system that uses AI not just to analyze the world, but to actively protect it.
