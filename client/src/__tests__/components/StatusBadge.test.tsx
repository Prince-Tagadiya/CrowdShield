import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../../components/shared/StatusBadge';

describe('StatusBadge', () => {
  it('renders the correct label for "clear" status', () => {
    render(<StatusBadge status="clear" />);
    expect(screen.getByText('Clear')).toBeDefined();
  });

  it('renders the correct label for "moderate" status', () => {
    render(<StatusBadge status="moderate" />);
    expect(screen.getByText('Moderate')).toBeDefined();
  });

  it('renders the correct label for "crowded" status', () => {
    render(<StatusBadge status="crowded" />);
    expect(screen.getByText('Crowded')).toBeDefined();
  });

  it('renders the correct label for "critical" status', () => {
    render(<StatusBadge status="critical" />);
    expect(screen.getByText('Critical')).toBeDefined();
  });

  it('has role="status" for accessibility', () => {
    render(<StatusBadge status="clear" />);
    const badge = screen.getByRole('status');
    expect(badge).toBeDefined();
  });

  it('includes descriptive aria-label', () => {
    render(<StatusBadge status="crowded" />);
    const badge = screen.getByRole('status');
    expect(badge.getAttribute('aria-label')).toBe('Zone status: Crowded');
  });

  it('applies the correct CSS class for each status', () => {
    const { container } = render(<StatusBadge status="critical" />);
    const badge = container.querySelector('.status-badge');
    expect(badge?.classList.contains('status-critical')).toBe(true);
  });

  it('applies size variant class', () => {
    const { container } = render(<StatusBadge status="clear" size="sm" />);
    const badge = container.querySelector('.status-badge');
    expect(badge?.classList.contains('status-badge--sm')).toBe(true);
  });

  it('defaults to "md" size', () => {
    const { container } = render(<StatusBadge status="clear" />);
    const badge = container.querySelector('.status-badge');
    expect(badge?.classList.contains('status-badge--md')).toBe(true);
  });

  it('marks emoji icon as decorative (aria-hidden)', () => {
    const { container } = render(<StatusBadge status="clear" />);
    const icon = container.querySelector('[aria-hidden="true"]');
    expect(icon).toBeDefined();
  });
});
