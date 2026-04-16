import { useState } from 'react';
import { useZones } from '../../context/ZoneContext';
import { updateZoneOccupancy } from '../../services/api';
import StatusBadge from '../shared/StatusBadge';
import { ZONE_TYPE_ICONS, getOccupancyPercent } from '../../utils/status';
import { formatWaitTime } from '../../utils/formatters';
import type { Zone } from '../../types';

/**
 * Staff zone control — update occupancy for each zone via slider.
 * Changes propagate in real-time to all connected attendees.
 */
export default function ZoneControl() {
  const { zones, loading } = useZones();
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOccupancyChange = async (zone: Zone, newOccupancy: number) => {
    setUpdating(zone.id);
    setError(null);

    try {
      await updateZoneOccupancy(zone.id, newOccupancy);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return null;

  return (
    <div className="zone-control" aria-label="Zone occupancy controls">
      {error && (
        <div className="zone-control__error" role="alert">{error}</div>
      )}

      <div className="zone-control__grid">
        {zones.map(zone => {
          const pct = getOccupancyPercent(zone.currentOccupancy, zone.capacity);
          const isUpdating = updating === zone.id;

          return (
            <div
              key={zone.id}
              className={`zone-control__card zone-control__card--${zone.status}`}
              aria-label={`Control for ${zone.name}`}
            >
              <div className="zone-control__header">
                <span aria-hidden="true">{ZONE_TYPE_ICONS[zone.type]}</span>
                <h3 className="zone-control__name">{zone.name}</h3>
                <StatusBadge status={zone.status} size="sm" />
              </div>

              <div className="zone-control__stats">
                <span>{zone.currentOccupancy.toLocaleString()} / {zone.capacity.toLocaleString()}</span>
                <span>{pct}%</span>
                <span>Wait: {formatWaitTime(zone.waitTimeMinutes)}</span>
              </div>

              <div className="zone-control__slider-group">
                <label
                  htmlFor={`occupancy-${zone.id}`}
                  className="sr-only"
                >
                  Occupancy for {zone.name}
                </label>
                <input
                  id={`occupancy-${zone.id}`}
                  type="range"
                  className="zone-control__slider"
                  min={0}
                  max={zone.capacity}
                  step={Math.max(1, Math.floor(zone.capacity / 100))}
                  value={zone.currentOccupancy}
                  onChange={e => handleOccupancyChange(zone, parseInt(e.target.value, 10))}
                  disabled={isUpdating}
                  aria-valuetext={`${zone.currentOccupancy} of ${zone.capacity} capacity`}
                />
              </div>

              {/* Occupancy bar */}
              <div
                className="zone-control__bar"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${zone.name} occupancy: ${pct}%`}
              >
                <div
                  className={`zone-control__bar-fill zone-control__bar-fill--${zone.status}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {isUpdating && (
                <span className="zone-control__updating" aria-live="polite">
                  Updating...
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
