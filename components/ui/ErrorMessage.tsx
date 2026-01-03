'use client'

interface ErrorMessageProps {
  message: string
  onDismiss?: () => void
  className?: string
}

export function ErrorMessage({ message, onDismiss, className = '' }: ErrorMessageProps) {
  if (!message) return null

  return (
    <div className={`mb-6 p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
      <div className="flex items-start justify-between">
        <p className="text-red-800 text-sm flex-1">{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-red-600 hover:text-red-800 font-semibold"
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

