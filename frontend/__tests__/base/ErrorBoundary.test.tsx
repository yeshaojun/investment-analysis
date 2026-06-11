/**
 * ErrorBoundary component tests
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '@/src/components/base/ErrorBoundary'

// Suppress React's error boundary re-throw noise in test output
let errorSpy: jest.SpyInstance
beforeEach(() => {
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  errorSpy.mockRestore()
})

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('render error')
  return <div>child content</div>
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it('shows default error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText(/页面渲染出错/)).toBeInTheDocument()
    expect(screen.getByText(/render error/)).toBeInTheDocument()
  })

  it('shows retry and refresh buttons on error', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('重试')).toBeInTheDocument()
    expect(screen.getByText('刷新页面')).toBeInTheDocument()
  })

  it('retry button is clickable without throwing', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText(/页面渲染出错/)).toBeInTheDocument()
    // Should not throw when clicked
    expect(() => fireEvent.click(screen.getByText('重试'))).not.toThrow()
  })

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('custom fallback')).toBeInTheDocument()
  })
})

