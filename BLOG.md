# Building VenueFlow: Real-Time Crowd Intelligence with Google Cloud, Firebase, and Gemini AI

**How I built a production crowd management platform for Wankhede Stadium that solves three converging failures at large sporting venues.**

---

## The Problem No One Talks About

If you've ever attended a cricket match at a venue like Mumbai's Wankhede Stadium — 33,000 capacity, narrow corridors, six access points — you've experienced the invisible tax of bad crowd management. You walk 8 minutes to a food counter only to find a 20-minute queue. Meanwhile, the food court on the opposite side has a 3-minute wait. You had no way to know.

This isn't just an inconvenience problem. It's a safety problem. When 33,000 people have zero visibility into congestion, bottlenecks compound. Staff coordinate over radios with no shared state. And the venue has no system that connects real-time occupancy data to attendee-facing guidance.

VenueFlow solves all three problems with a single real-time web application: **crowd visibility for attendees, unified state for staff, and congestion-aware navigation for everyone.**

## Architectural Decisions

### Why a Single Cloud Run Service?

The first decision was deployment architecture. I could have split the frontend and backend into two Cloud Run services, but for this scope, a single service is cleaner. Express serves the Vite-built static files **and** the API from one container. One URL, no CORS complexity between services, one set of env vars. The Dockerfile is multi-stage — client builds in one stage, server in another, and the production image contains only compiled artifacts and production dependencies. Final image is roughly 100MB.

### Firebase Realtime Database — Not Firestore, Not WebSockets

The core architectural bet was choosing Firebase Realtime Database over Firestore or a custom WebSocket server. Why?

1. **Push-based by default.** The `onValue` listener in the Firebase client SDK establishes a persistent connection and pushes updates the instant data changes. There's no polling, no interval, no manual WebSocket lifecycle management. When a staff member updates zone occupancy, every connected attendee sees the change within ~1 second.

2. **Serverless and scalable.** On Cloud Run, I don't need to manage connection state. Firebase handles that entirely outside my container. My server handles mutations and Gemini calls; Firebase handles the real-time fanout.

3. **One Google service doing two jobs.** RTDB serves as both the database and the real-time event bus. This reduces moving parts.

### The Data Model: One Source of Truth

The key design insight is that zone `status` ("clear", "moderate", "crowded", "critical") is never stored directly by humans. It's **derived** from `currentOccupancy / capacity`. When staff updates occupancy via a slider, my server runs `deriveStatus()` — a pure function with four thresholds — and writes the derived status and estimated wait time back to the database.

This means the attendee map, the zone cards, the navigation algorithm, and the AI chat context all derive from **the same field**: `currentOccupancy`. No synchronization bugs. No stale status.

### Dijkstra's Algorithm for Navigation

For congestion-aware navigation, I model the stadium's 6 zones as nodes in a weighted graph. Adjacent zones have edges. The edge weight to a zone equals its congestion ratio (0–1). Running Dijkstra on this graph finds the path through the **least congested** zones.

This isn't a gimmick. When the West Stand Food Court is at 85% capacity and the East Stand is at 60%, Dijkstra routes you through the east side. The path is displayed as an ordered list with live status badges and wait times for each zone.

### Gemini: Genuinely Useful, Not Decorative

I integrated Gemini 2.0 Flash at two points:

1. **Attendee AI Chat.** Users ask natural language questions like "where's the shortest food queue?" I inject **all current zone data** (names, types, occupancy, wait times) as context into the Gemini prompt. The model answers grounded in live data. It's essentially a RAG pattern without a vector database — the context window is small enough (6 zones, ~20 lines of text) to fit entirely.

2. **Staff Crowd Recommendations.** Staff can request AI-generated crowd management advice. I send all zone data plus active alerts to Gemini and get back specific, actionable recommendations: "Redirect Gate A traffic to Gate D (currently at 40% capacity)" or "Deploy additional staff to Sachin Tendulkar Stand restrooms — wait time exceeding 15 minutes."

3. **Alert Triage.** When a new alert is created and the zone is at "crowded" or "critical" status, Gemini assesses the situation and suggests response actions. This is debounced — it only triggers in high-congestion situations where AI triage adds value.

## Engineering Decisions for the Six Judging Criteria

### Code Quality
TypeScript strict mode on both client and server. Zod schemas for all API inputs. Shared type definitions. Every component is focused and modular. No god components. The zone calculator module is a set of pure functions with zero side effects.

### Security
- Firebase service account Base64-encoded in env vars (not on disk)
- JWT-verified auth middleware on all staff routes
- Helmet with a tailored CSP (whitelisting Google Maps, Fonts, Firebase specifically)
- CORS with explicit origin allowlist (no wildcards in production)
- Three-tier rate limiting: general (100/min), AI chat (20/min), AI recommendations (10/min)

### Efficiency
- Firebase RTDB `onValue` — real-time push, zero polling
- React context for zone data — single listener, memoized, shared across all components
- Vite code-splitting: React, Firebase, and React Router in separate chunks
- PWA with service worker caching app shell and Google Fonts
- Multi-stage Docker build for minimal production image

### Testing
32 tests passing:
- Status derivation at all boundary values (0%, 39%, 40%, 64%, 65%, 84%, 85%, 100%, over-capacity)
- Wait time estimation scaling and type-specific base waits
- Dijkstra pathfinding including congestion avoidance scenarios
- All Zod validation schemas at boundary values

### Accessibility
- WCAG AA contrast ratios on all text
- Status communicated via color + text label + emoji icon (never color alone)
- ARIA `role="status"`, `role="progressbar"`, `role="alert"`, `aria-live="polite"`
- Keyboard-navigable tab interface with `aria-selected` state
- `focus-visible` outlines on all interactive elements
- Screen reader-only labels on icon-only elements
- Skip-to-content landmark structure

### Google Services
Five distinct Google services with deep integration:
1. **Cloud Run** — Single-service deployment with health checks
2. **Firebase RTDB** — Real-time data push (not just CRUD)
3. **Firebase Auth** — Token verification with custom role claims
4. **Google Maps JS API** — Satellite view with dynamic zone markers
5. **Gemini 2.0 Flash** — Grounded AI chat and advisory, not canned responses

## Challenges

**Zod v4 migration.** I started with Zod v3 patterns (`error.errors`) and discovered v4 renamed this to `error.issues` and changed the `ZodError` class. A subtle breaking change that wouldn't surface until runtime if I hadn't been running `tsc --noEmit` after every phase.

**React 19 + JSX transform.** React 19 doesn't require `import React from 'react'` anymore with the new JSX transform. But TypeScript still flagged it as unused with `noUnusedLocals`. Had to remove all default React imports and use named imports for hooks and types instead.

**Vite plugin compatibility.** `vite-plugin-pwa` doesn't support Vite 8 yet. Had to pin to Vite 7 and find compatible versions of `@vitejs/plugin-react` and `vitest` that work together. Version compatibility across build tooling is still the hardest part of modern frontend engineering.

## The Result

VenueFlow is a fully functional, production-deployed crowd management platform. Staff update occupancy → all connected attendees see it within 1-2 seconds → the AI chat gives answers grounded in that live data → the navigation algorithm routes around congestion. It's a closed loop, not a demo.

The entire application — server, client, tests, Docker, deployment — was built in a single session. No stubs, no mocks in production, no placeholder data. The seed script loads 6 realistic zones with varied congestion levels so the demo is immediately convincing.

**Built for Google PromptWars on Hack2Skill. Powered by Google Cloud.**
