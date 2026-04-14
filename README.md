# CrowdShield
### AI-Powered Crowd Intelligence & Safety System

CrowdShield is a proactive, intelligence-driven platform designed to manage crowd safety and optimize stadium operations in real-time. By leveraging Google Gemini AI and mathematical optimization, it transforms raw data into actionable insights for both event organizers and attendees.

---

## 🚩 Problem Statement
Managing large-scale physical events involves critical challenges that existing static systems fail to address:
* **Crowd Congestion:** Unmanaged bottlenecks at gates and sections create safety risks.
* **Delayed Response:** Manual communication between fire, medical, and police teams slows emergency interventions.
* **Fractured Coordination:** Lack of a "Single Source of Truth" leads to misaligned team responses.
* **Guidance Gap:** Attendees often lack real-time, personalized information on the fastest ways to navigate or exit.

---

## 🛠️ Solution Overview
CrowdShield is more than a dashboard; it is a **Decision-Making Ecosystem**.
* **Real-Time Monitoring:** Live visualization of stadium density and worker locations.
* **Intelligent Routing:** A mathematical scoring engine that determines the optimal path based on wait time, distance, and crowd levels.
* **AI-Generated Directives:** Integrates **Google Gemini** to process incident data and generate professional coordination commands.
* **Universal Accessibility:** Dedicated modes for Command Center operators, specialized emergency teams, and stadium attendees.

---

## ✨ Key Features

### 🖥️ Command Center & Decision Engine
A high-level oversight dashboard that utilizes a **Weighted Scoring Algorithm** to highlight the most efficient gates, exits, and food stalls, ensuring balanced flow across the venue.

### 🚨 AI Alert & Multi-Team System
When an incident is reported, the system uses AI to analyze severity and automatically route alerts to specific teams (Fire, Medical, Police). It features a **Live Alert Widget** that broadcasts critical notifications stadium-wide.

### 🚻 Attendee & Lost & Found Mode
Extremely lightweight, mobile-friendly interfaces. Attendee Mode offers one-click AI guidance for nearby facilities, while the Lost & Found system provides a structured recovery workflow for reconnecting missing individuals with parents.

---

## ⚙️ System Architecture & Flow
The system follows a linear logic path to ensure speed and reliability:
`Event Trigger` → `Gemini AI Analysis` → `Decision Engine Scoring` → `Dynamic Alert Routing` → `Team Response` → `Public Guidance`

---

## 💻 Code Highlights

### 1. Decision Scoring Logic
```javascript
// Optimized logic: Lower score = Better option
function calculateScore(item) {
  const crowdPenalty = (item.level === 'high') ? 50 : (item.level === 'medium' ? 25 : 10);
  return (item.waitTime * 0.5) + (item.distance * 0.3) + (crowdPenalty * 0.2);
}
```

### 2. Event-to-Team Mapping
```javascript
const BASE_EVENTS = {
  'fire': { name: 'Fire', primaryTeams: ['fire', 'police'], evacRequired: true },
  'medical': { name: 'Medical Emergency', primaryTeams: ['medical'], evacRequired: false }
};
```

### 3. Gemini Prompt Structure
```javascript
const prompt = `A ${event.name} reported at ${event.loc}. Teams: ${event.teams}. 
Generate a 2-sentence professional command center output for dispatch results.`;
```

---

## 🚀 Tech Stack
* **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6+)
* **Tooling:** Vite (Fast Environment)
* **Intelligence:** Google Gemini AI API
* **Backend (Planned):** Firebase Authentication & Firestore for real-time sync

---

## 🔮 Future Scope
* **IoT Sensor Integration:** Real-time occupancy and thermal sensors for automated surge detection.
* **Firebase Real-Time Sync:** Moving from simulated JSON to live database streams for multi-device coordination.
* **Google Maps API:** Mapping precise GPS coordinates for worker tracking and outdoor crowd flow.
* **Predictive Analytics:** Using historical data to predict surges before they happen.
* **Mesh Networking:** Redundant communication for high-density environments where cellular signals fail.

---

## 📝 Assumptions
* **Data:** Currently uses simulated JSON structures for rapid prototyping.
* **Simulation:** Worker movement and crowd fluctuations are generated via JavaScript intervals.
* **AI Processing:** Responses are based on structured prompts sent to the Gemini-1.5-Flash model.

---

## 🛰️ Vision
**CrowdShield is a real-time intelligent system designed to improve safety, coordination, and experience in large physical events.**
