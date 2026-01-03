'use client'

import { Step } from '@/types'

interface ProgressStepsProps {
  steps: Array<{ id: Step; label: string; number: number }>
  currentStep: Step
  onStepClick?: (step: Step) => void
  canNavigateToStep?: (step: Step) => boolean
}

export function ProgressSteps({ steps, currentStep, onStepClick, canNavigateToStep }: ProgressStepsProps) {
  const getCurrentStepIndex = () => {
    return steps.findIndex(s => s.id === currentStep)
  }

  const currentIndex = getCurrentStepIndex()

  return (
    <div className="mb-8 bg-gray-100 rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {steps.map((s, index) => {
          const isActive = currentStep === s.id
          const isCompleted = currentIndex > index
          const canNavigate = canNavigateToStep ? canNavigateToStep(s.id) : true

          return (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <button
                  onClick={() => {
                    if (canNavigate && onStepClick) {
                      onStepClick(s.id)
                    }
                  }}
                  disabled={!canNavigate}
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg scale-110 cursor-default'
                      : isCompleted
                      ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
                      : canNavigate
                      ? 'bg-gray-300 text-gray-600 hover:bg-gray-400 cursor-pointer'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  title={canNavigate ? `Go to ${s.label}` : 'Complete previous steps first'}
                >
                  {isCompleted ? '✓' : s.number}
                </button>
                <button
                  onClick={() => {
                    if (canNavigate && onStepClick) {
                      onStepClick(s.id)
                    }
                  }}
                  disabled={!canNavigate}
                  className={`text-xs mt-2 font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600 cursor-default'
                      : isCompleted
                      ? 'text-green-600 hover:text-green-700 cursor-pointer'
                      : canNavigate
                      ? 'text-gray-600 hover:text-gray-800 cursor-pointer'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                  title={canNavigate ? `Go to ${s.label}` : 'Complete previous steps first'}
                >
                  {s.label}
                </button>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-1 flex-1 mx-2 rounded ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

