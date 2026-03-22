"use client";

import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="bg-white/10 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="text-4xl mb-4">&#9888;</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Une erreur est survenue
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Quelque chose s&apos;est mal pass&eacute;. Veuillez r&eacute;essayer.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              R&eacute;essayer
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
