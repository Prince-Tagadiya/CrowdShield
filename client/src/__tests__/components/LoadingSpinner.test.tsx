import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import '@testing-library/jest-dom';

describe('LoadingSpinner Component', () => {
  it('renders with default label', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<LoadingSpinner label="Fetching data" />);
    expect(screen.getByText(/Fetching data/i)).toBeInTheDocument();
  });

  it('is accessible with aria-live and role', () => {
    render(<LoadingSpinner />);
    const container = screen.getByRole('status');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });

  it('renders the visual spinner element', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.loading-spinner__circle');
    expect(spinner).toBeInTheDocument();
  });
});
