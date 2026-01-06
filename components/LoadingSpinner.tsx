'use client'

interface LoadingSpinnerProps {
  message?: string
  subMessage?: string
  size?: 'sm' | 'md' | 'lg'
  fullScreen?: boolean
}

export function LoadingSpinner({ 
  message = 'Loading...', 
  subMessage,
  size = 'md',
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-b-2',
    lg: 'h-16 w-16 border-b-2',
  }

  const content = (
    <div className="text-center py-12">
      <div className={`inline-block animate-spin rounded-full ${sizeClasses[size]} border-blue-600`}></div>
      {message && (
        <p className={`mt-4 text-gray-600 font-semibold ${size === 'lg' ? 'text-lg' : ''}`}>
          {message}
        </p>
      )}
      {subMessage && (
        <p className={`mt-2 text-sm text-gray-500 ${size === 'lg' ? 'text-base' : ''}`}>
          {subMessage}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        {content}
      </div>
    )
  }

  return content
}

