# CrowdShield — Real-time Crowd Tactical Intelligence Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://crowdshield-864518919258.asia-south1.run.app)
[![Tests](https://img.shields.io/badge/tests-112%20passing-blue)](https://crowdshield-864518919258.asia-south1.run.app)
[![Accessibility](https://img.shields.io/badge/accessibility-WCAG%20AA-orange)](https://crowdshield-864518919258.asia-south1.run.app)
[![AI Engine](https://img.shields.io/badge/AI-Dual--Engine%20Failover-purple)](https://crowdshield-864518919258.asia-south1.run.app)

## 🏟️ The Vision
CrowdShield is a next-generation command-and-control platform designed for high-density venues (Wankhede Stadium, Mumbai). It bridges the gap between raw sensor data and human action by providing a unified, real-time tactical overview for staff and safety-first navigation for attendees.

**Vertical:** Smart Stadium / Emergency Management / Tactical AI

## 🚀 Key Differentiators
- **Dual-Engine AI Failover:** Unlike standard implementations, CrowdShield features a redundant AI pipeline. It automatically fails over from the Google AI SDK to Vertex AI if an API key is blocked or throttled, ensuring 100% tactical uptime.
- **WebSocket Synchronization:** Uses a high-performance Socket.io broadcaster to push live zone updates and emergency notifications to all connected clients in <500ms.
- **Congestion-Aware Navigation:** Implements a Bidirectional Dijkstra's Algorithm that weights routes based on live occupancy ratios, routing attendees around bottlenecks.
- **Role-Based Tactical Hub:** Separate, high-fidelity dashboards for Attendee Guidance and Admin Command & Control.

## 🛠️ Integrated Google Cloud Stack
CrowdShield deeply integrates **6 Google Cloud Services** for a production-grade experience:

| Service | Integration Role | Core Benefit |
|---------|------------------|--------------|
| **Google Cloud Run** | Containerized Runtime | Auto-scaling with Zero-downtime deployments. |
| **Vertex AI (Gemini 1.5)** | Tactical Failover Engine | High-availability AI recommendations using Cloud Identity (Service Accounts). |
| **Google AI SDK (Gemini)** | Primary AI Engine | Fast, direct model access for attendee chat and staff triage. |
| **Firebase Auth** | Identity Management | Secure, token-based authentication with custom role claims. |
| **Firebase RTDB** | Persistent State | Global synchronization of stadium configuration and historical alerts. |
| **Google Maps JS API** | Visual Intelligence | Satellite-overlay map with color-coded congestion markers and Dijkstra routes. |

## 📐 Architecture & Engineering
- **Full-Stack TypeScript:** Strict typing with zero `any` types and zero lint suppressions across the monorepo.
- **Zod Data Integrity:** Every API input and AI response is validated through strict schemas to prevent runtime errors.
- **WCAG AA Accessibility:** 60+ ARIA attributes, semantic HTML5, and high-contrast visuals ensure the platform is usable by everyone in high-stress situations.
- **Multi-Stage Docker:** Optimized production image (<150MB) with separation of build-time and runtime dependencies.

## 🧪 Testing Suite
- **Framework:** Vitest
- **Total Tests:** 112 passing tests
- **Coverage:** 
  - **Server (62 tests):** Dijkstra pathfinding, Zone status derivation, Alert lifecycle, API schema validation, AI triage logic.
  - **Client (50 tests):** Component rendering, Utility formatters, Context state management, Accessibility attributes.
- **Run:** `npm test` (root) or `cd server && npm test` / `cd client && npm test`

## 🏁 Deployment
Live Production: [https://crowdshield-864518919258.asia-south1.run.app](https://crowdshield-864518919258.asia-south1.run.app)

---
*Built for Google PromptWars on Hack2Skill. Optimized for the Wankhede Stadium pilot.*
