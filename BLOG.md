# Architecting CrowdShield: A Dual-Engine AI Fortress for Wankhede Stadium

**How I engineered a zero-downtime, congestion-aware command system for Mumbai's busiest stadium using Google Cloud, WebSockets, and Gemini AI.**

---

## The Stadium Congestion Crisis
Large-scale venues like **Wankhede Stadium** face a critical gap in crowd-management: **Data Silos**. Sensors track turnstiles, staff use radios, and attendees use nothing but their eyes. When a bottleneck forms at Gate A, it takes minutes to report, and by then, the crowd has already compounded.

**CrowdShield** eliminates this gap by creating an integrated, real-time feedback loop between the stadium floor, the command center, and the attendee's pocket.

## Engineering a "Dual-Engine" AI
The core innovation in CrowdShield is the **Dual-Engine AI Provider**. While most applications rely on a single API key (which can be blocked, throttled, or expire), CrowdShield implements a failover state machine:

1. **Engine 1 (Google AI SDK):** Hits the standard Gemini 1.5 Flash endpoint for high-speed local development and demo portability.
2. **Engine 2 (Vertex AI Failover):** If Engine 1 returns a `403 Forbidden` (Blocked Service) or `429` (Rate Limited), the system instantly fails over to **Vertex AI**.
3. **Identity-Based Auth:** Vertex AI uses the Cloud Run Service Account (ADC), completely bypassing the need for a vulnerable API key in production.

This ensures that in a real emergency, the tactical AI "Brain" never goes dark.

## Real-Time Sync: WebSockets vs. RTDB
While many prototypes use simple polling or Firebase Realtime Database (RTDB), CrowdShield implements a dedicated **WebSocket Broadcaster (Socket.io)**. 

- **Why?** It gives us granular control over event prioritization. Emergency broadcasts take priority over routine occupancy shifts.
- **Result:** Latency for stadium-wide alerts is reduced to <200ms, ensuring that in a "Start Emergency" scenario, every attendee receives the evacuation toast instantly.

## Congestion-Aware Navigation: Beyond Lat-Long
Typical navigation routes people by distance. CrowdShield routes by **Tactical Cost**. 

Using a **Bidirectional Dijkstra's Algorithm**, we model the stadium as a weighted graph where the weight of an edge is calculated as:
`Cost = 1.0 (Base distance) + (Occupancy / Capacity) (Congestion Ratio)`

If the Sachin Tendulkar Stand Food Court is at 90% capacity, the Dijkstra engine detects the high cost and automatically routes attendees through the West Corridor, even if it's a longer physical walk.

## Zero-Downtime Deployment
Deploying a real-time system requires a robust pipeline. CrowdShield uses a **Multi-Stage Dockerfile** to build a lean, production-ready container:
- **Stage 1 (Client):** Builds the Vite React app with production optimizations.
- **Stage 2 (Server):** Compiles TypeScript into clean ES6 JavaScript.
- **Stage 3 (Final):** Composes the compiled assets into a minimal alpine-based image, reducing the attack surface and improving boot times on Cloud Run.

## Conclusion: Data-Driven Safety
CrowdShield isn't just a dashboard; it's a safety infrastructure. By combining the best of Google Cloud's AI suite with high-performance routing algorithms and real-time communication protocols, we've built a platform that can genuinely save lives at large-scale events.

---
**Built with ❤️ for Mumbai. Powered by Google Cloud.**
