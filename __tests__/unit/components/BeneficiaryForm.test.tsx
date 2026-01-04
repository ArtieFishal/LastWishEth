import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BeneficiaryForm } from '@/components/BeneficiaryForm'

// Mock viem
const mockGetEnsName = vi.fn()
const mockGetEnsAddress = vi.fn()

vi.mock('viem', () => ({
  createPublicClient: vi.fn(() => ({
    getEnsName: mockGetEnsName,
    getEnsAddress: mockGetEnsAddress,
  })),
  http: vi.fn(),
  mainnet: {},
}))

// Mock security utilities - use vi.hoisted to avoid hoisting issues
const mockIsValidEthereumAddress = vi.hoisted(() => vi.fn((address: string) => {
  if (!address) return false
  return /^0x[a-fA-F0-9]{40}$/i.test(address)
}))

const mockIsValidENSName = vi.hoisted(() => vi.fn((name: string) => {
  if (!name) return false
  return name.endsWith('.eth')
}))

vi.mock('@/lib/security', () => ({
  sanitizeInput: (input: string) => input.trim(),
  isValidEthereumAddress: mockIsValidEthereumAddress,
  isValidENSName: mockIsValidENSName,
}))

describe('BeneficiaryForm', () => {
  const mockOnBeneficiariesChange = vi.fn()
  // Valid 42-character Ethereum address (0x + 40 hex chars)
  const VALID_ETH_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset validation mocks to default behavior
    mockIsValidEthereumAddress.mockImplementation((address: string) => {
      if (!address) return false
      return /^0x[a-fA-F0-9]{40}$/i.test(address)
    })
    mockIsValidENSName.mockImplementation((name: string) => {
      if (!name) return false
      return name.endsWith('.eth')
    })
  })

  it('should render beneficiary form', () => {
    render(
      <BeneficiaryForm
        beneficiaries={[]}
        onBeneficiariesChange={mockOnBeneficiariesChange}
      />
    )

    expect(screen.getByPlaceholderText(/John Doe/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/0x\.\.\. or name\.eth/i)).toBeInTheDocument()
  })

  it('should add a beneficiary with valid data', async () => {
    const user = userEvent.setup()
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    
    // Mock getEnsName to return null immediately (no ENS resolution)
    mockGetEnsName.mockResolvedValue(null)
    
    render(
      <BeneficiaryForm
        beneficiaries={[]}
        onBeneficiariesChange={mockOnBeneficiariesChange}
      />
    )

    const nameInput = screen.getByPlaceholderText(/John Doe/i)
    const addressInput = screen.getByPlaceholderText(/0x\.\.\. or name\.eth/i)

    // Fill in the form
    await user.clear(nameInput)
    await user.type(nameInput, 'John Doe')
    
    await user.clear(addressInput)
    // Use a valid 42-character Ethereum address (0x + 40 hex chars)
    const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
    await user.type(addressInput, validAddress)
    
    // Wait for ENS resolution debounce (500ms) to complete
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Button should be enabled now
    const addButton = await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Add/i })
      if (btn.hasAttribute('disabled')) {
        throw new Error('Button still disabled')
      }
      return btn
    }, { timeout: 2000 })
    
    // Click the button
    await user.click(addButton)

    // Wait for callback - check that it was called
    await waitFor(() => {
      if (!mockOnBeneficiariesChange.mock.calls.length) {
        // Check if alert was called (validation failed)
        if (alertSpy.mock.calls.length > 0) {
          throw new Error(`Validation failed: ${alertSpy.mock.calls[0][0]}`)
        }
        throw new Error('Callback not called yet')
      }
    }, { timeout: 3000 })

    expect(mockOnBeneficiariesChange).toHaveBeenCalledTimes(1)
    const callArgs = mockOnBeneficiariesChange.mock.calls[0][0]
    expect(callArgs).toHaveLength(1)
    expect(callArgs[0].name).toBe('John Doe')
    expect(callArgs[0].walletAddress.toLowerCase()).toBe(validAddress.toLowerCase())
    
    alertSpy.mockRestore()
  })

  it('should not add beneficiary with empty name', async () => {
    const user = userEvent.setup()
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(
      <BeneficiaryForm
        beneficiaries={[]}
        onBeneficiariesChange={mockOnBeneficiariesChange}
      />
    )

    const addressInput = screen.getByPlaceholderText(/0x\.\.\. or name\.eth/i)
    
    await user.type(addressInput, VALID_ETH_ADDRESS, { delay: 10 })
    
    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 700))
    
    const addButton = screen.getByRole('button', { name: /Add/i })
    
    // Button should be disabled if name is empty
    expect(addButton).toBeDisabled()
    
    // Try to click anyway (shouldn't trigger due to disabled state)
    // But if it somehow triggers, it should show alert
    if (!addButton.hasAttribute('disabled')) {
      await user.click(addButton)
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Please fill in both name and wallet address')
      }, { timeout: 1000 })
    }

    expect(mockOnBeneficiariesChange).not.toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it('should not add beneficiary with empty address', async () => {
    const user = userEvent.setup()
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(
      <BeneficiaryForm
        beneficiaries={[]}
        onBeneficiariesChange={mockOnBeneficiariesChange}
      />
    )

    const nameInput = screen.getByPlaceholderText(/John Doe/i)

    await user.type(nameInput, 'John Doe', { delay: 10 })
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const addButton = screen.getByRole('button', { name: /Add/i })
    
    // Button should be disabled if address is empty
    expect(addButton).toBeDisabled()
    
    // Try to click anyway (shouldn't trigger due to disabled state)
    if (!addButton.hasAttribute('disabled')) {
      await user.click(addButton)
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Please fill in both name and wallet address')
      }, { timeout: 1000 })
    }

    expect(mockOnBeneficiariesChange).not.toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it('should enforce maximum of 10 beneficiaries', async () => {
    const user = userEvent.setup()
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const existingBeneficiaries = Array.from({ length: 10 }, (_, i) => ({
      id: `ben-${i}`,
      name: `Beneficiary ${i + 1}`,
      walletAddress: `0x${'0'.repeat(40)}`,
    }))

    render(
      <BeneficiaryForm
        beneficiaries={existingBeneficiaries}
        onBeneficiariesChange={mockOnBeneficiariesChange}
      />
    )

    const nameInput = screen.getByPlaceholderText(/John Doe/i)
    const addressInput = screen.getByPlaceholderText(/0x\.\.\. or name\.eth/i)

    await user.type(nameInput, 'Extra Beneficiary', { delay: 10 })
    await user.type(addressInput, VALID_ETH_ADDRESS, { delay: 10 })
    
    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 700))
    
    const addButton = screen.getByRole('button', { name: /Add/i })
    
    // Button should be disabled when at max
    expect(addButton).toBeDisabled()
    
    // Try to click anyway (shouldn't trigger due to disabled state)
    if (!addButton.hasAttribute('disabled')) {
      await user.click(addButton)
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Maximum 10 beneficiaries allowed')
      }, { timeout: 1000 })
    }

    expect(mockOnBeneficiariesChange).not.toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it('should resolve ENS name to address', async () => {
    const user = userEvent.setup()
    mockGetEnsAddress.mockResolvedValue(VALID_ETH_ADDRESS)

    render(
      <BeneficiaryForm
        beneficiaries={[]}
        onBeneficiariesChange={mockOnBeneficiariesChange}
      />
    )

    const addressInput = screen.getByPlaceholderText(/0x\.\.\. or name\.eth/i)
    await user.type(addressInput, 'vitalik.eth')

    await waitFor(() => {
      expect(mockGetEnsAddress).toHaveBeenCalledWith({ name: 'vitalik.eth' })
    }, { timeout: 1000 })
  })

  it('should resolve address to ENS name', async () => {
    const user = userEvent.setup()
    mockGetEnsName.mockResolvedValue('vitalik.eth')

    render(
      <BeneficiaryForm
        beneficiaries={[]}
        onBeneficiariesChange={mockOnBeneficiariesChange}
      />
    )

    const addressInput = screen.getByPlaceholderText(/0x\.\.\. or name\.eth/i)
    await user.type(addressInput, VALID_ETH_ADDRESS, { delay: 10 })

    // Wait for debounce (500ms) + resolution
    await waitFor(() => {
      expect(mockGetEnsName).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  // Note: BeneficiaryForm doesn't render the list of beneficiaries or remove buttons
  // The list is rendered in AllocateStep component, so removal is tested there
  // This test is skipped as it's not part of this component's responsibility
  it.skip('should remove a beneficiary', async () => {
    // This functionality is handled by the parent component (AllocateStep)
    // BeneficiaryForm only handles adding beneficiaries
  })

  it('should allow optional fields (phone, email, notes)', async () => {
    const user = userEvent.setup()
    mockGetEnsName.mockResolvedValue(null)
    
    render(
      <BeneficiaryForm
        beneficiaries={[]}
        onBeneficiariesChange={mockOnBeneficiariesChange}
      />
    )

    const nameInput = screen.getByPlaceholderText(/John Doe/i)
    const addressInput = screen.getByPlaceholderText(/0x\.\.\. or name\.eth/i)
    const phoneInput = screen.getByPlaceholderText(/\+1 \(555\) 123-4567/i)
    const emailInput = screen.getByPlaceholderText(/john@example\.com/i)
    const notesInput = screen.getByPlaceholderText(/Additional info/i)

    await user.type(nameInput, 'John Doe', { delay: 10 })
    await user.type(addressInput, VALID_ETH_ADDRESS, { delay: 10 })
    await user.type(phoneInput, '123-456-7890', { delay: 10 })
    await user.type(emailInput, 'john@example.com', { delay: 10 })
    await user.type(notesInput, 'Test notes', { delay: 10 })
    
    // Wait for ENS resolution debounce
    await new Promise(resolve => setTimeout(resolve, 700))
    
    const addButton = screen.getByRole('button', { name: /Add/i })
    await waitFor(() => {
      expect(addButton).not.toBeDisabled()
    }, { timeout: 1000 })
    
    await user.click(addButton)

    await waitFor(() => {
      expect(mockOnBeneficiariesChange).toHaveBeenCalled()
    }, { timeout: 2000 })

    const callArgs = mockOnBeneficiariesChange.mock.calls[0][0]
    expect(callArgs[0].phone).toBe('123-456-7890')
    expect(callArgs[0].email).toBe('john@example.com')
    expect(callArgs[0].notes).toBe('Test notes')
  })
})

