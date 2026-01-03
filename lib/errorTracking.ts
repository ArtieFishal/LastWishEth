// Error tracking utilities

interface ErrorContext {
  step?: string
  component?: string
  userAction?: string
  additionalInfo?: Record<string, any>
}

class ErrorTracker {
  private enabled: boolean = true

  trackError(error: Error, context?: ErrorContext) {
    if (!this.enabled || typeof window === 'undefined') return

    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...context,
      }

      console.error('[Error Tracking]', errorData)

      // Send to error tracking service (e.g., Sentry, LogRocket, etc.)
      // Example:
      // fetch('/api/errors', {
      //   method: 'POST',
      //   body: JSON.stringify(errorData),
      // }).catch(() => {})

    } catch (trackingError) {
      // Fail silently - error tracking should never break the app
      console.error('Error tracking failed:', trackingError)
    }
  }

  trackWarning(message: string, context?: ErrorContext) {
    if (!this.enabled) return
    console.warn('[Warning]', message, context)
  }

  disable() {
    this.enabled = false
  }

  enable() {
    this.enabled = true
  }
}

export const errorTracker = new ErrorTracker()

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorTracker.trackError(
      new Error(event.message),
      {
        component: 'global',
        additionalInfo: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      }
    )
  })

  window.addEventListener('unhandledrejection', (event) => {
    errorTracker.trackError(
      new Error(event.reason?.message || 'Unhandled promise rejection'),
      {
        component: 'global',
        additionalInfo: {
          reason: event.reason,
        },
      }
    )
  })
}

