import { useMemo } from 'react';
import { useZones } from '../../context/ZoneContext';
import './HeroBanner.css';

/**
 * Modern Stadium Hero Banner.
 * Incorporates high-fidelity geometric stadium visuals with live telemetry metrics.
 */
export default function HeroBanner() {
  const { zones, loading } = useZones();

  const stats = useMemo(() => {
    if (!zones || zones.length === 0) return null;
    const totals = zones.reduce((acc, z) => {
      acc.people += (z.currentOccupancy || 0);
      acc.capacity += (z.capacity || 0);
      return acc;
    }, { people: 0, capacity: 0 });

    return {
      totalPeople: totals.people,
      totalCapacity: totals.capacity,
      overallPct: Math.min(100, Math.round((totals.people / totals.capacity) * 100))
    };
  }, [zones]);

  if (loading) {
    return <section className="hero-banner hero-banner--loading" aria-busy="true" />;
  }

  // If no stats but not loading, we still show the brand but with zeroed metrics
  const displayStats = stats || { totalPeople: 0, totalCapacity: 0, overallPct: 0 };

  return (
    <section className="hero-banner" aria-label="CrowdShield Introduction">
      <div className="hero-content">
        <div className="hero-badge">
          <span className="pulse-dot"></span>
          Live Venue Intelligence
        </div>
        <h1 className="hero-title">
          Intelligent Crowd Management for the <span className="text-accent">Modern Stadium</span>
        </h1>
        <p className="hero-description">
          Scale stadium operations with AI-driven analytics. Enhance safety, 
          optimize staff coordination, and ensure every attendee experience 
          is seamless from gates to seats.
        </p>
        <div className="hero-actions">
          <button className="btn-primary-lg shadow-glow" onClick={() => (window.location.href = '#zones')}>
            Explore Live Map
          </button>
          <button className="btn-secondary-lg">
            Watch Tactical Demo
          </button>
        </div>
        
        <div className="hero-metrics-brief">
          <div className="brief-item">
            <strong>{displayStats.totalPeople.toLocaleString()}</strong>
            <span>Active Fans</span>
          </div>
          <div className="brief-line"></div>
          <div className="brief-item">
            <strong>{displayStats.overallPct}%</strong>
            <span>Venue Occupancy</span>
          </div>
        </div>
      </div>

      <div className="hero-visual">
        <div className="hero-image-wrapper">
          <img 
            src="/stadium_hero.png" 
            alt="Intelligent Stadium Heatmap visualization" 
          />
          <div className="visual-overlay-glow"></div>
        </div>
      </div>
    </section>
  );
}