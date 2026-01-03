'use client'

import { useEffect, useState } from 'react'

interface SuccessAnimationProps {
  show: boolean
  message?: string
  onComplete?: () => void
}

export function SuccessAnimation({ show, message = 'Success!', onComplete }: SuccessAnimationProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (show) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsAnimating(false)
        if (onComplete) {
          setTimeout(onComplete, 500)
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  if (!show || !isAnimating) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md mx-4 transform transition-all">
        <div className="flex flex-col items-center">
          {/* Success Checkmark Animation */}
          <div className="relative w-20 h-20 mb-4">
            <svg
              className="w-20 h-20 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                className="stroke-current"
                strokeWidth="2"
                fill="none"
                strokeDasharray="62.83"
                strokeDashoffset="62.83"
                style={{
                  animation: 'drawCircle 0.6s ease-out forwards'
                }}
              />
              <path
                d="M9 12l2 2 4-4"
                className="stroke-current"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="10"
                strokeDashoffset="10"
                style={{
                  animation: 'drawCheck 0.4s ease-out 0.6s forwards'
                }}
              />
            </svg>
          </div>
          <p className="text-xl font-bold text-gray-900">{message}</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes drawCircle {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes drawCheck {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  )
}

