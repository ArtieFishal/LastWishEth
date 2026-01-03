'use client'

interface ErrorRecoveryProps {
  error: string | null
  onRetry?: () => void
  onDismiss?: () => void
  retryText?: string
}

export function ErrorRecovery({ error, onRetry, onDismiss, retryText = 'Retry' }: ErrorRecoveryProps) {
  if (!error) return null

  return (
    <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-bold text-red-900">Error</h3>
          </div>
          <p className="text-sm text-red-800 mb-3">{error}</p>
          <div className="flex gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                {retryText}
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

