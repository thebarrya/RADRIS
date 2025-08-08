'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log error to monitoring service (e.g., Sentry)
    this.logErrorToService(error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
    // In production, you would send this to your error monitoring service
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
      url: typeof window !== 'undefined' ? window.location.href : '',
    };

    // Example: Send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData),
      // }).catch(console.error);
    }

    console.error('Error details:', errorData);
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} reset={this.handleReset} />;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-red-900">
                  Erreur inattendue
                </CardTitle>
                <CardDescription>
                  Une erreur s'est produite dans l'application RADRIS
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-100 p-3 rounded text-sm text-gray-700">
                  <strong>Détails de l'erreur:</strong>
                  <br />
                  {this.state.error?.message}
                </div>

                {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                  <details className="bg-gray-100 p-3 rounded text-xs">
                    <summary className="cursor-pointer font-medium mb-2">
                      Stack trace (développement)
                    </summary>
                    <pre className="whitespace-pre-wrap text-gray-600">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={this.handleReset}
                    variant="outline"
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Réessayer
                  </Button>
                  
                  <Button
                    onClick={this.handleReload}
                    variant="outline"
                    className="flex-1"
                  >
                    Recharger la page
                  </Button>
                  
                  <Button
                    onClick={this.handleGoHome}
                    className="flex-1"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Accueil
                  </Button>
                </div>

                <div className="text-xs text-gray-500 text-center pt-2">
                  Si le problème persiste, veuillez contacter l'assistance technique.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for function components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const captureError = React.useCallback((error: Error) => {
    console.error('Captured error:', error);
    setError(error);
    
    // Log to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send error to monitoring service
    }
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    captureError,
    resetError,
  };
}

// Simple error fallback component
export function SimpleErrorFallback({ 
  error, 
  reset 
}: { 
  error: Error; 
  reset: () => void; 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        Une erreur s'est produite
      </h2>
      <p className="text-gray-600 mb-4">
        {error.message}
      </p>
      <Button onClick={reset}>
        Réessayer
      </Button>
    </div>
  );
}