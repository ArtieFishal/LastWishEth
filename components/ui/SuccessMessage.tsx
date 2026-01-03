'use client'

interface SuccessMessageProps {
  message: string
  onDismiss?: () => void
  className?: string
}

export function SuccessMessage({ message, onDismiss, className = '' }: SuccessMessageProps) {
  if (!message) return null

  return (
    <div className={`mb-6 p-4 bg-green-50 border border-green-200 rounded-lg ${className}`}>
      <div className="flex items-start justify-between">
        <p className="text-green-800 text-sm flex-1">{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-green-600 hover:text-green-800 font-semibold"
            aria-label="Dismiss success message"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

