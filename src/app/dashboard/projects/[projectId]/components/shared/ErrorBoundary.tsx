'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

/**
 * ErrorBoundary Props
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * ErrorBoundary State
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * ErrorBoundary Component
 *
 * React Error Boundary - fängt JavaScript-Fehler in Child-Komponenten
 * Verhindert, dass ein Fehler die ganze Page crasht
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <ExclamationTriangleIcon className="h-12 w-12 mx-auto" />
          </div>
          <Heading>Ein Fehler ist aufgetreten</Heading>
          <p className="text-gray-500 mt-2">{this.state.error?.message}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Seite neu laden
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
