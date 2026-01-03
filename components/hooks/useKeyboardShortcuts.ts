'use client'

import { useEffect } from 'react'
import { Step } from '@/types'

interface KeyboardShortcutsConfig {
  onStepChange?: (step: Step) => void
  onSave?: () => void
  onNext?: () => void
  onPrevious?: () => void
  onSearch?: () => void
  enabled?: boolean
}

export function useKeyboardShortcuts({
  onStepChange,
  onSave,
  onNext,
  onPrevious,
  onSearch,
  enabled = true,
}: KeyboardShortcutsConfig) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return
      }

      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        onSave?.()
        return
      }

      // Ctrl/Cmd + K to search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        onSearch?.()
        return
      }

      // Arrow keys for navigation (only if not in input)
      if (e.key === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        onNext?.()
        return
      }

      if (e.key === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        onPrevious?.()
        return
      }

      // Number keys 1-6 for step navigation
      if (e.key >= '1' && e.key <= '6' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        const stepNumber = parseInt(e.key)
        const steps: Step[] = ['connect', 'assets', 'allocate', 'details', 'payment', 'download']
        if (steps[stepNumber - 1] && onStepChange) {
          onStepChange(steps[stepNumber - 1])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, onStepChange, onSave, onNext, onPrevious, onSearch])
}

