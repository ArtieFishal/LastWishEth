'use client'

import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 ${className}`}>
      <div className="max-w-md mx-auto">
        {icon && (
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            {icon}
          </div>
        )}
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  )
}

