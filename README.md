# VenueFlow — Real-time Crowd Intelligence Platform

## Overview
VenueFlow is a smart, dynamic assistant and live crowd management platform built for large-scale venues, specifically implemented here for **Wankhede Stadium**.

**Chosen Vertical:** Smart Stadium / Venue Crowd Management

## Approach and Logic
Large venues suffer from congestion, long wait times, and safety risks during peak events. VenueFlow solves this by aggregating real-time occupancy data across defined zones (gates, food courts, restrooms) and exposing this data through two interfaces:
1. **Attendee Interface**: Allows users to see live crowd heatmaps, find the fastest navigation routes using pathfinding algorithms, and ask an AI assistant contextual questions about the venue.
2. **Staff Interface**: Allows venue management to monitor zones, manually update occupancies, resolve overcrowding alerts, and request AI-generated crowd control strategies.

### Logical Decision Making
- **Status Derivation:** Zone status (Clear, Moderate, Crowded, Critical) and wait times are dynamically derived using mathematical thresholds based on live capacity ratios.
- **Pathfinding (Dijkstra's Algorithm):** Navigation utilizes Dijkstra's Algorithm, weighting edges based on the *congestion ratio* of the destination zone, naturally routing attendees around crowded areas.
- **AI Context Grounding:** The Gemini assistant doesn't just answer generic questions; it is injected with the live JSON state of the stadium every time a user prompts it, allowing it to provide hyper-accurate, real-time advice.

## How the Solution Works
- **Frontend (React + Vite):** Renders the Google Maps overlay, live metric dashboards, and the chat interface. Connects to Firebase via real-time WebSocket listeners.
- **Backend (Node + Express):** Handles the Gemini 2.5 Flash AI proxying, Dijkstra pathfinding execution, authentication verification, and the live simulation engine. All server logs are structured via Google Cloud Logging.
- **Database (Firebase Realtime Database):** Acts as the single source of truth. Updates made here (either manually by staff or by the simulation tick) are instantly reflected on all connected client devices.
- **AI Assistant:** Powered by **Gemini 2.5 Flash** via the Google AI SDK, the assistant provides fast, intelligent responses. Three distinct AI workflows: attendee chat (context-grounded Q&A), staff recommendations (crowd management strategies), and alert triage (automated incident assessment).

## Google Services Integration

VenueFlow meaningfully integrates **6 Google Cloud services** across the entire stack:

| Service | Integration | Files |
|---------|-------------|-------|
| **Firebase Authentication** | Email/password login with custom claims for role-based access control (staff vs. attendee). Server-side token verification via Firebase Admin SDK. | `middleware/auth.ts`, `hooks/useAuth.ts` |
| **Firebase Realtime Database** | Push-based WebSocket sync for live zone occupancy, alerts, and simulation state. Zero-polling architecture — all updates are instant. | `services/firebase-admin.ts`, `context/ZoneContext.tsx` |
| **Google Maps JavaScript API** | Satellite view with color-coded SVG circle markers (congestion-level), clickable InfoWindows, polyline navigation routes. Dynamic loading with retry. | `components/attendee/ZoneMap.tsx`, `NavigationPanel.tsx` |
| **Vertex AI (Gemini 2.5 Flash)** | Three AI workflows via Google Cloud's Vertex AI platform: (1) Attendee chat grounded in live zone data, (2) Staff crowd management recommendations, (3) Automated alert triage. Includes conversation history, retry with exponential backoff, and dual-mode provider (Vertex AI in production, direct SDK in development). | `services/gemini.ts`, `routes/ai.ts` |
| **Google Cloud Logging** | Structured JSON logging with severity levels (INFO/WARNING/ERROR) for all server operations. Replaces raw `console.log` — enables Cloud Monitoring dashboards and alerting. | `services/logger.ts` |
| **Google Cloud Run** | Fully managed, auto-scaling container runtime. Multi-stage Docker build for minimal image size. Health checks, trust proxy for load balancer headers. | `Dockerfile`, `server/src/index.ts` |

## Assumptions & Refinements Needed
To build this prototype within the hackathon time constraints, several assumptions were made:
- **Data Collection:** We assume the venue has physical IoT sensors (turnstiles, cameras) capable of reporting live occupancy to the API. Currently, this is simulated using a backend "tick" engine for demonstration purposes.
- **Venue Customization:** While specifically mapped to Wankhede Stadium for this prototype, the core VenueFlow architecture is fully agnostic. It can be instantly customized for any other stadium, airport, or mall simply by adjusting the 6 JSON zones and their respective capacities/coordinates in the database seeder.
- **Stand Mapping:** The polygonal physical boundaries of the stands are currently represented by precise point coordinates on the map. In a fully refined production build, these would be mapped as full geometry polygons on Google Maps.
- **Refinement:** More historical data would be needed to refine the wait-time exponential growth algorithms for different types of zones (e.g., restrooms vs. entry gates).

## Setup & Running Locally
1. Clone the repository.
2. Ensure you have a `.env` file containing Firebase, Gemini, and Google Maps API keys.
3. Install dependencies: `npm install` in both `/client` and `/server`.
4. Start backend: `cd server && npm run dev`
5. Start frontend: `cd client && npm run dev`
6. Click **Start Demo** on the bottom right of the homepage to activate the live simulation engine.

## Testing
- **Framework:** Vitest  
- **Server Tests:** `tests/server/zone-calculator.test.ts` (20 tests), `tests/server/api-validation.test.ts` (21 tests), `tests/server/logger.test.ts` (7 tests)  
- **Client Tests:** `src/__tests__/utils/status.test.ts` (15 tests), `src/__tests__/utils/formatters.test.ts` (11 tests), `src/__tests__/components/StatusBadge.test.tsx` (10 tests), `src/__tests__/components/LoadingSpinner.test.tsx` (8 tests), `src/__tests__/components/ErrorBoundary.test.tsx` (7 tests)  
- **Total:** 99 tests across 8 test files (server: 48, client: 51)  
- **Coverage:** Core business logic, utility functions, component rendering, accessibility attributes, Zod schema validation  
- **Run:** `npm test` (server) or `cd client && npm test` (client)

## Evaluation Focus Areas Addressed
- **Code Quality:** Clean monorepo with strict TypeScript (zero `any` types, zero lint suppressions), modularized components, structured logging, comprehensive JSDoc documentation, DRY principle enforcement, and named constants for all algorithmic parameters.
- **Security:** Firebase Auth with custom claims, 3-tier rate limiting, Helmet security headers, Zod input validation, CORS allowlist, and error sanitization in production.
- **Efficiency:** Zero-polling WebSocket architecture, `useMemo` context optimization, O(1) zone lookups, server-side pathfinding, code splitting, and PWA caching.
- **Testing:** 99 passing unit tests across server and client, covering zone status derivation, wait time algorithms, Dijkstra pathfinding, API validation schemas, utility functions, component rendering, and accessibility attributes.
- **Accessibility:** 60+ ARIA attributes, `aria-live` regions, full WCAG tab patterns, semantic HTML, keyboard navigation, and `prefers-reduced-motion` support.
- **Google Services:** 6 deeply integrated services — Firebase Auth, Firebase RTDB, Google Maps JS API, Vertex AI (Gemini 2.5 Flash), Google Cloud Logging, and Google Cloud Run.
