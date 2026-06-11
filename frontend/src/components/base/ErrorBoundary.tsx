'use client'

import React from 'react'
import { Button } from '@/src/components/ui/button'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Page-level error boundary — catches render errors that would otherwise
 * show a blank page. Displays a recoverable error message with a reload option.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-destructive text-sm font-medium">
            页面渲染出错，请尝试刷新
          </p>
          {this.state.error && (
            <p className="text-xs text-muted-foreground max-w-sm break-all">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={this.handleReset}>
              重试
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
