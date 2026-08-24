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
    // Log the error details to console for debugging in dev environment
    console.error('ErrorBoundary caught an uncaught exception:', error, errorInfo);
  }

  handleReload = () => {
    // Hard refresh application state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-root">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">
              <ShieldAlert size={40} />
            </div>
            <h1 className="error-boundary-title">Application Crash</h1>
            <p className="error-boundary-text">
              An unexpected client-side exception occurred while rendering this view. Please try reloading the portal to restore service.
            </p>
            <Button variant="primary" onClick={this.handleReload} style={{ width: '100%' }}>
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
