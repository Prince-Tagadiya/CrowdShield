/**
 * Format a timestamp (ms since epoch) as a relative time string.
 * e.g., "2 min ago", "1 hr ago", "Just now"
 */
export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Format wait time for display.
 */
export function formatWaitTime(minutes: number): string {
  if (minutes <= 0) return 'No wait';
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

/**
 * Format a number with commas for readability.
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}
