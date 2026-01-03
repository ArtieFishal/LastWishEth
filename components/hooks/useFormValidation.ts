'use client'

import { Beneficiary, QueuedWalletSession } from '@/types'

interface OwnerData {
  ownerFullName: string
  ownerAddress: string
  ownerCity: string
  ownerState: string
  ownerZipCode: string
  ownerPhone: string
}

interface ExecutorData {
  executorName: string
  executorAddress: string
  executorPhone: string
  executorEmail: string
}

export function useFormValidation() {
  const validateOwnerData = (data: OwnerData): string[] => {
    const errors: string[] = []
    if (!data.ownerFullName.trim()) errors.push('Owner full name')
    if (!data.ownerAddress.trim()) errors.push('Owner address')
    if (!data.ownerCity.trim()) errors.push('Owner city')
    if (!data.ownerState.trim()) errors.push('Owner state')
    if (!data.ownerZipCode.trim()) errors.push('Owner zip code')
    if (!data.ownerPhone.trim()) errors.push('Owner phone')
    return errors
  }

  const validateExecutorData = (data: ExecutorData): string[] => {
    const errors: string[] = []
    if (!data.executorName.trim()) errors.push('Executor name')
    if (!data.executorAddress.trim()) errors.push('Executor address')
    if (!data.executorPhone.trim()) errors.push('Executor phone')
    if (!data.executorEmail.trim()) errors.push('Executor email')
    return errors
  }

  const validateBeneficiaries = (beneficiaries: Beneficiary[]): string[] => {
    const errors: string[] = []
    if (beneficiaries.length === 0) {
      errors.push('At least one beneficiary')
    }
    return errors
  }

  const validateAllocations = (queuedSessions: QueuedWalletSession[]): string[] => {
    const errors: string[] = []
    const totalAllocations = queuedSessions.reduce((sum, session) => sum + session.allocations.length, 0)
    if (totalAllocations === 0) {
      errors.push('Asset allocations (allocate assets to beneficiaries)')
    }
    return errors
  }

  const validateKeyInstructions = (keyInstructions: string): string[] => {
    const errors: string[] = []
    if (!keyInstructions.trim()) {
      errors.push('Key access instructions')
    }
    return errors
  }

  const validateQueuedSessions = (queuedSessions: QueuedWalletSession[]): string[] => {
    const errors: string[] = []
    if (queuedSessions.length === 0) {
      errors.push('No wallets queued - please connect wallets, add assets, and save to queue')
    }
    return errors
  }

  const validatePaymentForm = (
    ownerData: OwnerData,
    executorData: ExecutorData,
    beneficiaries: Beneficiary[],
    queuedSessions: QueuedWalletSession[],
    keyInstructions: string
  ): string[] => {
    return [
      ...validateQueuedSessions(queuedSessions),
      ...validateOwnerData(ownerData),
      ...validateExecutorData(executorData),
      ...validateBeneficiaries(beneficiaries),
      ...validateAllocations(queuedSessions),
      ...validateKeyInstructions(keyInstructions),
    ]
  }

  return {
    validateOwnerData,
    validateExecutorData,
    validateBeneficiaries,
    validateAllocations,
    validateKeyInstructions,
    validateQueuedSessions,
    validatePaymentForm,
  }
}

