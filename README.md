# CrowdShield — Real-time Crowd Intelligence Platform

> **Live Deployment:** [https://crowdshield-864518919258.asia-south1.run.app](https://crowdshield-864518919258.asia-south1.run.app)  
> **Health Check:** [https://crowdshield-864518919258.asia-south1.run.app/api/health](https://crowdshield-864518919258.asia-south1.run.app/api/health)

## Overview

CrowdShield is an AI-powered crowd management and safety platform built for large-scale venues such as stadiums, concerts, and public events.

**Chosen Vertical:** Smart Stadium / Crowd Safety System

CrowdShield transforms real-time crowd data into intelligent safety decisions, helping prevent overcrowding, reduce risk, and improve overall event management.

---

## Approach and Logic

Large venues often face congestion, delayed response times, and safety risks during peak hours. CrowdShield solves this by continuously analyzing real-time crowd conditions across different zones (gates, exits, food areas, restrooms).

The system operates on three core layers:

* **Data Layer:** Collects live crowd density, movement speed, and entry/exit flow.
* **Intelligence Layer:** AI evaluates risk levels and predicts future congestion using Gemini & Vertex AI.
* **Action Layer:** Generates alerts, recommendations, and navigation guidance.

This ensures the system does not just detect issues — it actively prevents them.

---

## Logical Decision Making

CrowdShield uses a combination of rule-based logic and AI reasoning:

* **Status Derivation:**
  Zones are classified as **Safe**, **Warning**, **High Risk**, or **Critical** based on density thresholds and movement patterns.

* **Prediction Engine:**
  Predicts crowd conditions in the next 5-10 minutes to prevent overcrowding before it becomes a hazard.

* **Action Generation:**
  Suggests tactical actions such as:
  * Redirecting crowd flow to underutilized gates.
  * Opening additional emergency exits.
  * Restricting entry temporarily during surges.

* **Explainability:**
  Every decision includes reasoning (e.g., *"Density exceeded 85% safe limits"* or *"Exit flow insufficient at current velocity"*).

---

## How the Solution Works

* **Frontend (Vite Web App):** Displays live crowd status, alerts, and navigation guidance with high-end tactical dashboards.
* **Backend (Node.js + Express):** Handles AI orchestration, validation, and claim-based routing.
* **Database (Firestore):** Stores real-time crowd data and alerts with document-level security.
* **AI Engine (Vertex AI - Gemini):** Processes telemetry and generates intelligent crowd management decisions.

All updates are reflected in real-time across connected users via Firestore listeners.

---

## Core Features

### Real-Time Crowd Monitoring
* Live density tracking across stadium zones.
* Dynamic status updates with high-fidelity visual indicators (Red / Yellow / Green).

### AI Decision Engine
* Detects high-risk zones using real-time telemetry.
* Predicts congestion before it happens.
* Suggests actionable tactical decisions with reasoning.

### Smart Alerts System
* Priority-based alerts (Critical, Warning, Safe).
* Includes recommended actions tailored for operational units.

### Staff Command Center
* Role-based access (Admin, Fire, Medical, Police).
* AI-assisted incident handling with "Human-in-the-loop" approval flow.

### Attendee Experience
* Live navigation guidance for best gate, fast exit, and amenities.
* Direct emergency reporting pipeline.

### Simulation Mode
* Simulate crowd surges and emergency events to demonstrate system behavior under pressure.

---

## Google Services Integration

CrowdShield is deeply integrated with the Google Cloud ecosystem:

| Service | Role |
|---|---|
| **Firebase Authentication** | Secure role-based identity via custom claims. |
| **Firestore** | Real-time tactical state synchronization. |
| **Firestore Rules** | Document-level security enforced by user role. |
| **Google Maps API** | 3D Venue visualization and orientation. |
| **Vertex AI (Gemini)** | Core predictive and decision-making engine. |
| **Cloud Run** | High-performance production hosting. |
| **Cloud Logging** | Structured operational observability. |
| **Cloud Monitoring** | Uptime and health alerting. |

---

## Security
* **Identity:** Custom claims (`admin`, `fire`, `medical`, `police`, `attendee`).
* **Data:** Firestore Security Rules ensure users only see relevant alerts.
* **API:** Protected by Helmet (CSP), Rate Limiting, and Zod input validation.

---

## Testing
CrowdShield includes automated Vitest coverage for the decision engine, AI fallback behavior, and server route validation.

```bash
npm test
```

---

## Test Accounts
Use the following accounts for demo:
* **Admin:** `admin@test.com`
* **Fire Ops:** `fire@test.com`
* **Medical Ops:** `med@test.com`
* **Police Ops:** `pol@test.com`
* **Attendee:** `user@test.com`

**Password:** `CrowdShield123!`

---

## Setup & Running Locally

1. **Clone** the repository.
2. **Setup .env** with your Firebase and Gemini credentials.
3. **Install:** `npm install`
4. **Build & Start:**
```bash
npm run build
PORT=59005 npm start
```

---

## Future Evolution
* IoT hardware integration for real pressure sensor data.
* Historical pattern analysis via BigQuery.
* Drone-based aerial monitoring feedback loops.

---

**Conclusion:** CrowdShield is a real-world deployable system that provides fast, explainable, and actionable insights to save lives in high-pressure environments.
