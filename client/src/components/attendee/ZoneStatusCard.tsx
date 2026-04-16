import type { Zone } from '../../types';
import StatusBadge from '../shared/StatusBadge';
import { ZONE_TYPE_ICONS, ZONE_TYPE_LABELS, getOccupancyPercent } from '../../utils/status';
import { formatWaitTime, formatRelativeTime } from '../../utils/formatters';

interface ZoneStatusCardProps {
  zone: Zone;
}

/**
 * Individual zone status card showing occupancy, wait time, and status.
 * Fully accessible with ARIA labels and keyboard-focusable.
 */
export default function ZoneStatusCard({ zone }: ZoneStatusCardProps) {
  const occupancyPct = getOccupancyPercent(zone.currentOccupancy, zone.capacity);

  return (
    <article
      className={`zone-card zone-card--${zone.status}`}
      aria-label={`${zone.name}: ${zone.status}, ${formatWaitTime(zone.waitTimeMinutes)} wait`}
      tabIndex={0}
      id={`zone-card-${zone.id}`}
    >
      <div className="zone-card__header">
        <span className="zone-card__type-icon" aria-hidden="true">
          {ZONE_TYPE_ICONS[zone.type]}
        </span>
        <div className="zone-card__title-group">
          <h3 className="zone-card__name">{zone.name}</h3>
          <span className="zone-card__type-label">{ZONE_TYPE_LABELS[zone.type]}</span>
        </div>
        <StatusBadge status={zone.status} size="sm" />
      </div>

      <div className="zone-card__stats">
        <div className="zone-card__stat">
          <span className="zone-card__stat-label">Wait Time</span>
          <span className="zone-card__stat-value zone-card__stat-value--wait">
            {formatWaitTime(zone.waitTimeMinutes)}
          </span>
        </div>
        <div className="zone-card__stat">
          <span className="zone-card__stat-label">Capacity</span>
          <span className="zone-card__stat-value">
            {zone.currentOccupancy.toLocaleString()} / {zone.capacity.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Occupancy bar — visual indicator */}
      <div
        className="zone-card__occupancy-bar"
        role="progressbar"
        aria-valuenow={occupancyPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Occupancy: ${occupancyPct}%`}
      >
        <div
          className={`zone-card__occupancy-fill zone-card__occupancy-fill--${zone.status}`}
          style={{ width: `${occupancyPct}%` }}
        />
      </div>
      <span className="zone-card__occupancy-pct">{occupancyPct}% full</span>

      <div className="zone-card__footer">
        <span className="zone-card__updated">
          Updated {formatRelativeTime(zone.lastUpdated)}
        </span>
      </div>
    </article>
  );
}
