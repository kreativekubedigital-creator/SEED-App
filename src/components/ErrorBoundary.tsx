import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F2ED] p-4 text-center">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl max-w-md w-full border border-black/5">
            <h2 className="text-2xl font-serif font-medium mb-4">Something went wrong</h2>
            <p className="text-gray-800 mb-6">
              We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#2563EB] text-white px-8 py-3 rounded-full font-medium hover:bg-opacity-90 transition-all"
            >
              Refresh Page
            </button>
            {this.state.error && (
              <pre className="mt-6 p-4 bg-red-50 text-red-700 text-xs rounded-xl overflow-auto text-left">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
