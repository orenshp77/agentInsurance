'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { sendLog, getDeviceInfo } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  componentName?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // Send error to logging system
    sendLog({
      message: `Component Error: ${error.message}`,
      errorLevel: 'CRITICAL',
      stack: error.stack,
      componentName: this.props.componentName || 'Unknown',
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white/5 border border-red-500/30 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} className="text-red-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">אופס! משהו השתבש</h1>
            <p className="text-foreground-muted mb-6">
              התרחשה שגיאה בלתי צפויה. הצוות שלנו קיבל התראה ויטפל בבעיה בהקדם.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-black/30 rounded-lg p-4 mb-6 text-right">
                <p className="text-red-400 text-sm font-mono break-all">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="text-xs text-gray-500 mt-2 overflow-x-auto max-h-32 overflow-y-auto">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
              >
                <RefreshCw size={18} />
                נסה שוב
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 bg-lime-500 hover:bg-lime-600 rounded-lg text-black font-medium transition-colors"
              >
                <Home size={18} />
                דף הבית
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
