import type { ZoneStatus } from '../../types';
import { STATUS_CLASSES, STATUS_LABELS, STATUS_ICONS } from '../../utils/status';

interface StatusBadgeProps {
  status: ZoneStatus;
  /** Optional size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Accessible status badge that communicates status via:
 * 1. Color (CSS class → background color)
 * 2. Text label (always visible)
 * 3. Emoji icon (decorative, paired with text)
 *
 * This satisfies WCAG 1.4.1 (Use of Color) — status is never
 * communicated by color alone.
 */
export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  return (
    <span
      className={`status-badge ${STATUS_CLASSES[status]} status-badge--${size}`}
      role="status"
      aria-label={`Zone status: ${STATUS_LABELS[status]}`}
    >
      <span aria-hidden="true">{STATUS_ICONS[status]}</span>
      {' '}
      {STATUS_LABELS[status]}
    </span>
  );
}
