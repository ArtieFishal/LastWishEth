'use client'

import { useState, useEffect } from 'react'
import { Step } from '@/types'
import { useLocalStorage } from './useLocalStorage'

export function useProgressTracking() {
  const [completedSteps, setCompletedSteps] = useLocalStorage<Step[]>('lastwish_completedSteps', [])
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  useEffect(() => {
    setLastSaved(new Date())
  }, [])

  const markStepComplete = (step: Step) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step])
    }
  }

  const resetProgress = () => {
    setCompletedSteps([])
    setLastSaved(null)
  }

  const getProgressPercentage = (totalSteps: number) => {
    return (completedSteps.length / totalSteps) * 100
  }

  return {
    completedSteps,
    lastSaved,
    markStepComplete,
    resetProgress,
    getProgressPercentage,
  }
}

