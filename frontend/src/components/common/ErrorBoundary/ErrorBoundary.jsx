import React, { Component } from 'react';
import { ShieldAlert } from 'lucide-react';
import Button from '../Button/Button';
import './ErrorBoundary.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('ErrorBoundary caught an uncaught rendering exception:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-root">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">
              <ShieldAlert size={40} />
            </div>
            <h1 className="error-boundary-title">Something went wrong</h1>
            <p className="error-boundary-text">
              An unexpected application error occurred while rendering this component. Please try reloading the page or returning to the home screen.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              <Button variant="primary" onClick={this.handleReload} style={{ flex: 1 }}>
                Reload Page
              </Button>
              <Button variant="outline" onClick={this.handleGoHome} style={{ flex: 1 }}>
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
