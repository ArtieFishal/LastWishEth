'use client'

import { Step, StepConfig } from '@/types'

interface ProgressIndicatorProps {
  steps: StepConfig[]
  currentStep: Step
  completedSteps: Step[]
}

export function ProgressIndicator({ steps, currentStep, completedSteps }: ProgressIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStep)
  const completedCount = completedSteps.length
  const totalSteps = steps.length
  const progressPercentage = (completedCount / totalSteps) * 100

  return (
    <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-blue-900">
          Progress: {completedCount} of {totalSteps} steps completed
        </span>
        <span className="text-sm font-bold text-blue-700">
          {Math.round(progressPercentage)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      <p className="text-xs text-blue-700 mt-2">
        Current step: <strong>{steps[currentIndex]?.label}</strong>
      </p>
    </div>
  )
}

