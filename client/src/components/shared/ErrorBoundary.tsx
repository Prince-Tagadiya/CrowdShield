import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback message */
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Error boundary that catches rendering errors in AI components.
 * Shows a graceful fallback instead of a blank screen.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // Error state already captured by getDerivedStateFromError;
    // errorInfo available for future observability integration
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback" role="alert">
          <div className="error-boundary-icon" aria-hidden="true">⚠️</div>
          <h3 className="error-boundary-title">Something went wrong</h3>
          <p className="error-boundary-message">
            {this.props.fallbackMessage ?? 'This feature encountered an error. Please try again.'}
          </p>
          <p className="error-boundary-detail">{this.state.errorMessage}</p>
          <button
            className="error-boundary-retry"
            onClick={this.handleRetry}
            aria-label="Retry loading this section"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
