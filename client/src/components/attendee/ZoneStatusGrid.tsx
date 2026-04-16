import { useZones } from '../../context/ZoneContext';
import ZoneStatusCard from './ZoneStatusCard';

/**
 * Grid of all venue zones with real-time status.
 * Zones are sorted: critical first, then crowded, moderate, clear.
 */
export default function ZoneStatusGrid() {
  const { zones, loading, error } = useZones();

  if (loading) {
    return (
      <section aria-label="Loading venue zone status">
        <div className="zone-grid-header">
          <h2 className="section-title">Live Zone Status</h2>
          <p className="section-subtitle">Loading venue data...</p>
        </div>
        <div className="zone-grid" aria-busy="true">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="zone-card zone-skeleton">
              <div className="zone-skeleton__header" />
              <div className="zone-skeleton__body" />
              <div className="zone-skeleton__footer" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <div className="error-message" role="alert">
        <p>{error}</p>
      </div>
    );
  }

  if (zones.length === 0) {
    return (
      <div className="empty-state">
        <p>No zone data available. The venue may not be active yet.</p>
      </div>
    );
  }

  // Sort by urgency: critical → crowded → moderate → clear
  const statusOrder = { critical: 0, crowded: 1, moderate: 2, clear: 3 };
  const sortedZones = [...zones].sort(
    (a, b) => (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4)
  );

  return (
    <section aria-label="Venue zone status overview">
      <div className="zone-grid-header">
        <h2 className="section-title">Live Zone Status</h2>
        <p className="section-subtitle" aria-live="polite">
          {zones.length} zones monitored • Updated in real-time
        </p>
      </div>
      <div className="zone-grid" role="list">
        {sortedZones.map(zone => (
          <div key={zone.id} role="listitem">
            <ZoneStatusCard zone={zone} />
          </div>
        ))}
      </div>
    </section>
  );
}
