import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with role="status" for accessibility', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeDefined();
  });

  it('shows default label for screen readers', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('shows custom label when provided', () => {
    render(<LoadingSpinner label="Checking authentication..." />);
    expect(screen.getByText('Checking authentication...')).toBeDefined();
  });

  it('applies default md size class', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.loading-spinner');
    expect(spinner?.classList.contains('loading-spinner--md')).toBe(true);
  });

  it('applies sm size class', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.querySelector('.loading-spinner');
    expect(spinner?.classList.contains('loading-spinner--sm')).toBe(true);
  });

  it('applies lg size class', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.querySelector('.loading-spinner');
    expect(spinner?.classList.contains('loading-spinner--lg')).toBe(true);
  });

  it('hides spinner ring from screen readers', () => {
    const { container } = render(<LoadingSpinner />);
    const ring = container.querySelector('.spinner-ring');
    expect(ring?.getAttribute('aria-hidden')).toBe('true');
  });

  it('has sr-only label (visually hidden but accessible)', () => {
    const { container } = render(<LoadingSpinner label="Loading zones..." />);
    const srOnly = container.querySelector('.sr-only');
    expect(srOnly).toBeDefined();
    expect(srOnly?.textContent).toBe('Loading zones...');
  });
});
