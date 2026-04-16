interface LoadingSpinnerProps {
  /** Accessible label for screen readers */
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Animated loading spinner with screen reader announcement.
 */
export default function LoadingSpinner({
  label = 'Loading...',
  size = 'md',
}: LoadingSpinnerProps) {
  return (
    <div className={`loading-spinner loading-spinner--${size}`} role="status" aria-live="polite">
      <div className="spinner-ring" aria-hidden="true">
        <div></div><div></div><div></div><div></div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
