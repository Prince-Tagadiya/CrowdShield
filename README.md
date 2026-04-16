# 🏟️ CrowdShield — Real-time AI Crowd Intelligence Platform

**"Turning raw venue data into life-saving tactical decisions."**

CrowdShield is a production-ready, AI-powered crowd management platform designed for large-scale stadiums and public events. It transforms high-density occupancy data into actionable safety strategies using the **Gemini 1.5 Flash** decision engine.

---

## ⚡ The "Winning Moment" (Judge's Guide)

CrowdShield is designed for instant demo impact. Follow these steps to see the AI in action:

1. **Access the Admin Command Center**: Log in as `admin@venueflow.com` (Pass: `admin123`).
2. **Launch "Chaos Mode"**: Click the **🚨 START EMERGENCY** button.
3. **The AI Reaction**: 
   * Watch as the **Emergency HUD** turns deep red with tactile glitch animations.
   * Observe the **AI Tactical HUD** instantly generating a multi-point evacuation and re-routing strategy.
   * Verify the **Prediction → Action → Reasoning** loop as the AI analyzes the stampede risk in real-time.

---

## 🚀 Core Intelligence Pillars

### 1. The Tactical AI Brain (Gemini 1.5 Flash)
Unlike basic reporting systems, CrowdShield's AI acts as a **Live Control Center**. Every 5 seconds, it evaluates:
*   **Prediction**: Future congestion levels based on current flow rates.
*   **Action**: Immediate tactical directives for staff (e.g., "Redirect Gate A flow to Concourse B").
*   **Reasoning**: Data-backed justifications for every decision to build operator trust.

### 2. Bidirectional Dijkstra Navigation
Our custom-built navigation engine uses a **Bidirectional Dijkstra** algorithm to find the least congested paths through the stadium. By searching from both start and end points simultaneously, we deliver ultra-fast routing even during massive attendee surges.

### 3. Real-time Firebase Sync
Zero-polling architecture. Every occupancy change, alert creation, and AI recommendation is synced instantly across all attendee and staff devices using **Firebase Realtime Database**.

---

## 🛠️ Stack & Architecture

| Layer | Technology | Key Features |
| :--- | :--- | :--- |
| **Frontend** | React + Vite + TypeScript | Glassmorphic UI, Emergency Glitch FX, Google Maps API |
| **Backend** | Node.js + Express | Bi-directional Dijkstra, GCP Vertex AI Integration |
| **Database** | Firebase RTDB | Real-time state synchronization, Role-based auth |
| **Cloud** | Google Cloud Run | Auto-scaling production deployment (Asia-South1) |

---

## 🛡️ Role-Based Interfaces

*   **Attendee Portal**: Interactive stadium map, AI-powered "Ask AI" assistant, and congestion-aware routing.
*   **Staff Command Center**: Live zone monitoring, one-click Emergency Chaos simulation, and Tactical AI Readouts.
*   **Emergency Bridging**: Support for Legacy tactical roles (`fire`, `medical`, `police`) with specialized security claims.

---

## 🏗️ Local Setup

1. **Clone & Install**:
   ```bash
   git clone https://github.com/Prince-Tagadiya/CrowdShield
   cd CrowdShield
   npm install
   ```
2. **Environment**: Create a `.env` in the root with your `VITE_GEMINI_API_KEY` and `VITE_FIREBASE_API_KEY`.
3. **Run**:
   ```bash
   npm run dev
   ```

---

## ⚖️ Security & Performance
*   **Credential Masking**: Automated GitHub secret purging and GCP Environment variables.
*   **Rate Limiting**: Intelligent throttling for AI endpoints to prevent abuse.
*   **Node 20 (LTS)**: Optimized for long-term stability and compatibility.

---

**Developed for the VenueFlow Challenge.**
**Live Version**: [https://crowdshield-864518919258.asia-south1.run.app](https://crowdshield-864518919258.asia-south1.run.app)
