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

  if (loading || !stats) {
    return <section className="hero-banner hero-banner--loading" aria-busy="true" />;
  }

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
            <strong>{stats.totalPeople.toLocaleString()}</strong>
            <span>Active Fans</span>
          </div>
          <div className="brief-line"></div>
          <div className="brief-item">
            <strong>{stats.overallPct}%</strong>
            <span>Venue Occupancy</span>
          </div>
        </div>
      </div>

      <div className="hero-visual">
        <div className="hero-image-wrapper">
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-AcXgCYpDK0C3jMMcZHt2AAcIz5rPw9Npb5cmutry5_9ZzNRUzADPEPcteiKATLNtV3pZJVGkaXa7BGZ5eSVahyngy6XRZKuhRUPlo67ewZiPmimaDLsL0GO6-_oegex0ruzq3WAD2PoXt4hk3YDc0dbLHUq-lyY3v16UAvRkFPUIP58A9-Z9ZGB4xuS8wiGnu4d7SpG7ZOKKqIK8OI_22mjzHP0cjQ95H4Vdt79RwhjKlAS3uEd99WJHi05Oaj18gFCQjBBDAYE" 
            alt="Intelligent Stadium Heatmap visualization" 
          />
          <div className="visual-overlay-glow"></div>
        </div>
      </div>
    </section>
  );
}