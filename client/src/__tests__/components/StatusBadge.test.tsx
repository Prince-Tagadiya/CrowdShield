import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../../components/shared/StatusBadge';
import '@testing-library/jest-dom';

describe('StatusBadge Component', () => {
  it('renders correctly with clear status', () => {
    render(<StatusBadge status="clear" />);
    const badge = screen.getByText(/CLEAR/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('status-badge--clear');
  });

  it('renders correctly with moderate status', () => {
    render(<StatusBadge status="moderate" />);
    const badge = screen.getByText(/MODERATE/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('status-badge--moderate');
  });

  it('renders correctly with crowded status', () => {
    render(<StatusBadge status="crowded" />);
    const badge = screen.getByText(/CROWDED/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('status-badge--crowded');
  });

  it('renders correctly with critical status', () => {
    render(<StatusBadge status="critical" />);
    const badge = screen.getByText(/CRITICAL/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('status-badge--critical');
  });

  it('applies small size class when specified', () => {
    render(<StatusBadge status="clear" size="sm" />);
    const badge = screen.getByText(/CLEAR/i);
    expect(badge).toHaveClass('status-badge--sm');
  });

  it('applies large size class when specified', () => {
    render(<StatusBadge status="clear" size="lg" />);
    const badge = screen.getByText(/CLEAR/i);
    expect(badge).toHaveClass('status-badge--lg');
  });

  it('is accessible with proper aria-label', () => {
    render(<StatusBadge status="critical" />);
    const badge = screen.getByLabelText(/Status: critical/i);
    expect(badge).toBeInTheDocument();
  });
});
