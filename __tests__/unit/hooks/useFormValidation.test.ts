import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useFormValidation } from '@/components/hooks/useFormValidation'
import type { Beneficiary, QueuedWalletSession } from '@/types'

describe('useFormValidation', () => {
  it('should validate owner data', () => {
    const { result } = renderHook(() => useFormValidation())

    const errors = result.current.validateOwnerData({
      ownerFullName: '',
      ownerAddress: '',
      ownerCity: '',
      ownerState: '',
      ownerZipCode: '',
      ownerPhone: '',
    })

    expect(errors.length).toBe(6)
    expect(errors).toContain('Owner full name')
    expect(errors).toContain('Owner address')
  })

  it('should pass validation for complete owner data', () => {
    const { result } = renderHook(() => useFormValidation())

    const errors = result.current.validateOwnerData({
      ownerFullName: 'John Doe',
      ownerAddress: '123 Main St',
      ownerCity: 'City',
      ownerState: 'State',
      ownerZipCode: '12345',
      ownerPhone: '123-456-7890',
    })

    expect(errors.length).toBe(0)
  })

  it('should validate executor data', () => {
    const { result } = renderHook(() => useFormValidation())

    const errors = result.current.validateExecutorData({
      executorName: '',
      executorAddress: '',
      executorPhone: '',
      executorEmail: '',
    })

    expect(errors.length).toBe(4)
    expect(errors).toContain('Executor name')
    expect(errors).toContain('Executor address')
  })

  it('should validate beneficiaries', () => {
    const { result } = renderHook(() => useFormValidation())

    const errors = result.current.validateBeneficiaries([])
    expect(errors).toContain('At least one beneficiary')

    const errors2 = result.current.validateBeneficiaries([
      { name: 'Ben 1', walletAddress: '0x123' },
    ])
    expect(errors2.length).toBe(0)
  })

  it('should validate allocations', () => {
    const { result } = renderHook(() => useFormValidation())

    const emptySessions: QueuedWalletSession[] = []
    const errors = result.current.validateAllocations(emptySessions)
    expect(errors).toContain('Asset allocations (allocate assets to beneficiaries)')

    const sessionsWithAllocations: QueuedWalletSession[] = [
      {
        address: '0x123',
        assets: [],
        allocations: [{ beneficiaryIndex: 0, percentage: 100 }],
      },
    ]
    const errors2 = result.current.validateAllocations(sessionsWithAllocations)
    expect(errors2.length).toBe(0)
  })

  it('should validate key instructions', () => {
    const { result } = renderHook(() => useFormValidation())

    const errors = result.current.validateKeyInstructions('')
    expect(errors).toContain('Key access instructions')

    const errors2 = result.current.validateKeyInstructions('Some instructions')
    expect(errors2.length).toBe(0)
  })

  it('should validate queued sessions', () => {
    const { result } = renderHook(() => useFormValidation())

    const errors = result.current.validateQueuedSessions([])
    expect(errors).toContain('No wallets queued - please connect wallets, add assets, and save to queue')

    const sessions: QueuedWalletSession[] = [
      { address: '0x123', assets: [], allocations: [] },
    ]
    const errors2 = result.current.validateQueuedSessions(sessions)
    expect(errors2.length).toBe(0)
  })

  it('should validate complete payment form', () => {
    const { result } = renderHook(() => useFormValidation())

    const errors = result.current.validatePaymentForm(
      {
        ownerFullName: '',
        ownerAddress: '',
        ownerCity: '',
        ownerState: '',
        ownerZipCode: '',
        ownerPhone: '',
      },
      {
        executorName: '',
        executorAddress: '',
        executorPhone: '',
        executorEmail: '',
      },
      [],
      [],
      ''
    )

    expect(errors.length).toBeGreaterThan(0)
    expect(errors).toContain('No wallets queued - please connect wallets, add assets, and save to queue')
    expect(errors).toContain('Owner full name')
    expect(errors).toContain('At least one beneficiary')
  })

  it('should pass validation for complete payment form', () => {
    const { result } = renderHook(() => useFormValidation())

    const beneficiaries: Beneficiary[] = [
      { name: 'Ben 1', walletAddress: '0x123' },
    ]

    const queuedSessions: QueuedWalletSession[] = [
      {
        address: '0x123',
        assets: [],
        allocations: [{ beneficiaryIndex: 0, percentage: 100 }],
      },
    ]

    const errors = result.current.validatePaymentForm(
      {
        ownerFullName: 'John Doe',
        ownerAddress: '123 Main St',
        ownerCity: 'City',
        ownerState: 'State',
        ownerZipCode: '12345',
        ownerPhone: '123-456-7890',
      },
      {
        executorName: 'Jane Doe',
        executorAddress: '456 Oak St',
        executorPhone: '123-456-7890',
        executorEmail: 'jane@example.com',
      },
      beneficiaries,
      queuedSessions,
      'Key instructions here'
    )

    expect(errors.length).toBe(0)
  })
})

