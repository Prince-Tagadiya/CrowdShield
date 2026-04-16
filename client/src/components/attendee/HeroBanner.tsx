import { useMemo } from 'react';
import { useZones } from '../../context/ZoneContext';
import './HeroBanner.css';

/**
 * Hero banner with live aggregate stats and a capacity donut chart.
 * Uses a single-pass reduction for maximum performance.
 */
export default function HeroBanner() {
  const { zones, loading } = useZones();

  const stats = useMemo(() => {
    if (!zones || zones.length === 0) return null;

    const totals = zones.reduce((acc, z) => {
      acc.people += (z.currentOccupancy || 0);
      acc.capacity += (z.capacity || 0);
      acc.waitSum += (z.waitTimeMinutes || 0);
      
      if (z.status === 'critical' || z.status === 'crowded') acc.criticalCount++;
      if (z.status === 'clear' || z.status === 'moderate') acc.clearCount++;
      
      return acc;
    }, { people: 0, capacity: 0, waitSum: 0, criticalCount: 0, clearCount: 0 });

    return {
      totalPeople: totals.people,
      totalCapacity: totals.capacity,
      avgWait: Math.round(totals.waitSum / zones.length) || 0,
      criticalZones: totals.criticalCount,
      clearZones: totals.clearCount,
      zoneCount: zones.length
    };
  }, [zones]);

  if (loading || !stats) {
    return <section className="hero-banner hero-banner--loading" aria-busy="true" />;
  }

  const overallPct = Math.min(100, Math.round((stats.totalPeople / stats.totalCapacity) * 100));

  // SVG donut chart values
  const circumference = 2 * Math.PI * 54; // radius = 54
  const fillLength = (overallPct / 100) * circumference;
  const emptyLength = circumference - fillLength;
  const donutColor = overallPct >= 85 ? 'var(--color-critical)' :
                     overallPct >= 65 ? 'var(--color-crowded)' :
                     overallPct >= 40 ? 'var(--color-moderate)' : 'var(--color-clear)';

  return (
    <section className="hero-banner" aria-label="Venue overview dashboard">
      <div className="hero-content">
        <div className="hero-top-row">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="hero-title__venue">Wankhede Stadium</span>
              <span className="hero-title__tagline">Live Crowd Intelligence</span>
            </h1>
            <p className="hero-description">
              Real-time occupancy tracking and AI-powered navigation for 
              high-capacity venues—eliminating blind spots in the fan experience.
            </p>
          </div>

          {/* Capacity Donut Chart */}
          <div className="hero-donut" role="img" aria-label={`Overall venue capacity: ${overallPct}%`}>
            <svg viewBox="0 0 120 120" className="hero-donut__svg">
              {/* Background ring */}
              <circle
                cx="60" cy="60" r="54"
                fill="none"
                stroke="hsla(222, 20%, 25%, 0.4)"
                strokeWidth="10"
              />
              {/* Value ring */}
              <circle
                cx="60" cy="60" r="54"
                fill="none"
                stroke={donutColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${fillLength} ${emptyLength}`}
                strokeDashoffset={circumference * 0.25}
                className="hero-donut__fill"
                style={{ filter: `drop-shadow(0 0 6px ${donutColor})` }}
              />
            </svg>
            <div className="hero-donut__center">
              <span className="hero-donut__pct">{overallPct}%</span>
              <span className="hero-donut__label">Capacity</span>
            </div>
          </div>
        </div>

        <div className="hero-stats" role="group" aria-label="Live venue statistics">
          {/* People Inside */}
          <div className="hero-stat">
            <span className="hero-stat__value">{stats.totalPeople.toLocaleString()}</span>
            <span className="hero-stat__label">People Inside</span>
            <span className="hero-stat__sub">of {stats.totalCapacity.toLocaleString()} capacity</span>
          </div>

          <div className="hero-stat-divider" aria-hidden="true" />

          {/* Avg Wait */}
          <div className="hero-stat">
            <span className="hero-stat__value">
              {stats.avgWait}<span className="hero-stat__unit">min</span>
            </span>
            <span className="hero-stat__label">Avg Wait Time</span>
            <span className="hero-stat__sub">across all zones</span>
          </div>

          <div className="hero-stat-divider" aria-hidden="true" />

          {/* Zones at Risk */}
          <div className="hero-stat">
            <span className={`hero-stat__value ${stats.criticalZones > 0 ? 'hero-stat__value--alert' : ''}`}>
              {stats.criticalZones}
            </span>
            <span className="hero-stat__label">Zones at Risk</span>
            <span className="hero-stat__sub">{stats.clearZones} operating normally</span>
          </div>

          <div className="hero-stat-divider" aria-hidden="true" />

          {/* Active Sensors */}
          <div className="hero-stat">
            <span className="hero-stat__value hero-stat__value--live">
              <span className="hero-live-dot" aria-hidden="true" />
              {stats.zoneCount}
            </span>
            <span className="hero-stat__label">Active Sensors</span>
            <span className="hero-stat__sub">Real-time telemetry</span>
          </div>
        </div>
      </div>

      {/* Ambient visual backgrounds */}
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-grid-bg" aria-hidden="true" />
    </section>
  );
}