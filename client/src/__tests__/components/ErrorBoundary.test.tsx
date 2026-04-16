import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import ErrorBoundary from '../../components/shared/ErrorBoundary';

/** Component that throws on render to trigger the error boundary */
function ThrowingComponent({ error }: { error: Error }): ReactNode {
  throw error;
}

/** Component that renders normally */
function GoodComponent(): ReactNode {
  return <div data-testid="good-child">All good!</div>;
}

describe('ErrorBoundary', () => {
  // Suppress React error boundary console.error in tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('good-child')).toBeDefined();
    expect(screen.getByText('All good!')).toBeDefined();
  });

  it('renders fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('Test crash')} />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Something went wrong')).toBeDefined();
  });

  it('displays custom fallback message when provided', () => {
    render(
      <ErrorBoundary fallbackMessage="AI chat failed.">
        <ThrowingComponent error={new Error('Gemini timeout')} />
      </ErrorBoundary>
    );
    expect(screen.getByText('AI chat failed.')).toBeDefined();
  });

  it('displays the error message', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('Network timeout')} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Network timeout')).toBeDefined();
  });

  it('shows default fallback message when no custom one provided', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('crash')} />
      </ErrorBoundary>
    );
    expect(screen.getByText('This feature encountered an error. Please try again.')).toBeDefined();
  });

  it('has a retry button', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('crash')} />
      </ErrorBoundary>
    );
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeDefined();
  });

  it('retry button has accessible label', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('crash')} />
      </ErrorBoundary>
    );
    const retryBtn = screen.getByLabelText('Retry loading this section');
    expect(retryBtn).toBeDefined();
  });
});
