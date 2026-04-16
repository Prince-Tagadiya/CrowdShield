import HeroBanner from '../components/attendee/HeroBanner';
import ZoneStatusGrid from '../components/attendee/ZoneStatusGrid';
import { useZones } from '../context/ZoneContext';
import LoadingSpinner from '../components/shared/LoadingSpinner';

/**
 * Enhanced Landing Page — Optimized for Stadium Excellence.
 * Combines high-impact marketing sections with live operational data.
 */
export default function Home() {
  const { loading } = useZones();

  if (loading) return <LoadingSpinner label="Initializing Tactical Interface..." />;

  return (
    <div className="landing-page">
      {/* 🚀 Hero Section: Modern Stadium Architecture */}
      <HeroBanner />

      {/* 📊 Live Operational Layer: "Real-time Coordination" */}
      <section className="live-data-section">
        <div className="section-header text-center">
          <h2 className="section-title">Optimized for Stadium Excellence</h2>
          <p className="section-subtitle">
            Leveraging real-time AI to transform high-density environments into safe, efficient spaces.
          </p>
        </div>
        <ZoneStatusGrid />
      </section>

      {/* 🛡️ Feature Pillars: Emergency & Coordination */}
      <section className="feature-pillars">
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3>Emergency Response</h3>
            <p>Rapid dispatch system for Fire, Medical, and Police. Reduce response times by up to 40%.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🧠</div>
            <h3>AI Tactical Engine</h3>
            <p>Predict bottlenecks before they happen with our Gemini 1.5 Flash integration.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔎</div>
            <h3>Lost & Found</h3>
            <p>Efficient digital tools to reconnect people and property using AI-powered matching.</p>
          </div>
        </div>
      </section>

      {/* ⚡ Performance Edge Section */}
      <section className="performance-banner">
        <div className="performance-content">
          <span className="perf-badge">🚀 Unmatched Performance</span>
          <h2>Designed for the Modern Event</h2>
          <p>
            Built with a lightweight, &lt;1MB architecture, VenueFlow works on any device—even in low-connectivity stadium environments.
          </p>
          <ul className="perf-checklist">
            <li>✅ Responsive on tablets, mobile, and desktop</li>
            <li>✅ Real-time data synchronization over 3G/4G</li>
            <li>✅ Bidirectional Dijkstra pathfinding logic</li>
          </ul>
        </div>
        <div className="performance-visual">
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuChZ0yJaRkhDYPXrKxvC_t0XnL6GHkZ9UBgc279qNzrIBgeEyGv8R8igwokDLwEuJf98RfyyUu1QWGJmv0byxDdThYExv-KNYCgfkSuR46lTujYE0o8M78YTqfldSheYGf12ypsj4AgLGX9GUxBfGrAYpGyaPlcCjAlncBfW9Pfdfx5uvd9Qwmvy6tif-pbFvFOZRlutQcQO6GD-wDs5zqkkrK4w4ZTItsQE3mSsnPtE85rLwny3I6LvcTPPkNLRdr9cCActfG2Y2A" 
            alt="High-performance tablet interface" 
          />
        </div>
      </section>

      {/* 🏟️ Global CTA */}
      <section className="final-cta">
        <h2>Ready to transform your venue?</h2>
        <p>Join world-class stadiums using VenueFlow to manage millions of fans safely every year.</p>
        <div className="cta-buttons">
          <button className="btn-primary-lg">Inquire Now</button>
          <button className="btn-secondary-lg">Download Fact Sheet</button>
        </div>
      </section>
    </div>
  );
}
