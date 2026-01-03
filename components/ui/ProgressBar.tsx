'use client'

interface ProgressBarProps {
  current: number
  total: number
  label?: string
  className?: string
}

export function ProgressBar({ current, total, label, className = '' }: ProgressBarProps) {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{label}</span>
          <span>{current} / {total}</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      {!label && (
        <div className="text-xs text-gray-500 mt-1 text-right">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  )
}

