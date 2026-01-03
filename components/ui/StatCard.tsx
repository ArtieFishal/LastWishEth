'use client'

import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export function StatCard({ label, value, icon, trend, className = '' }: StatCardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  }

  return (
    <div className={`bg-white rounded-lg border-2 border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-600">{label}</span>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <p className={`text-2xl font-bold ${trend ? trendColors[trend] : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  )
}

