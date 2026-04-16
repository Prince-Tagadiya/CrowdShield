🏟️ Just shipped VenueFlow — a real-time crowd intelligence platform for Wankhede Stadium, Mumbai.

The problem: 33,000 people, zero visibility into congestion, fragmented staff coordination, and blind navigation inside the venue.

The solution: A production web app that gives attendees live zone status, wait times, congestion-aware routing (Dijkstra's algorithm), and an AI assistant powered by Gemini 2.5 Flash — all grounded in live data, not static FAQs.

Staff get a real-time dashboard to update zone occupancy, manage operational alerts, and receive AI-generated crowd management recommendations.

Built with:
⚡ Firebase Realtime Database for push-based sync
🗺️ Google Maps JS API for venue visualization
🤖 Gemini 2.5 Flash for grounded AI chat & recommendations
🔐 Firebase Auth with role-based access
☁️ Deployed on Google Cloud Run

The key insight: zone status is *derived* from occupancy, not manually set. One source of truth drives the entire system — map colors, wait estimates, navigation weights, and AI context.

32 tests passing. WCAG AA accessible. PWA-ready. Multi-stage Docker build.

Built for Google's PromptWars hackathon. Every line of code written in a single session.

#PromptWars #Hack2Skill #GoogleCloud #GeminiAPI #Firebase #WebDev #AI #Hackathon
