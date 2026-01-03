'use client'

import { useState, useEffect } from 'react'
import { useENSResolution } from '@/components/hooks/useENSResolution'
import { useFormValidation } from '@/components/hooks/useFormValidation'
import { CopyButton } from '@/components/ui/CopyButton'
import { QRCodeDisplay } from '@/components/ui/QRCodeDisplay'
import { QueuedWalletSession, Step } from '@/types'

interface DetailsStepProps {
  ownerFullName: string
  ownerEnsName: string
  ownerAddress: string
  ownerCity: string
  ownerState: string
  ownerZipCode: string
  ownerPhone: string
  executorName: string
  executorAddress: string
  executorPhone: string
  executorEmail: string
  executorTwitter: string
  executorLinkedIn: string
  keyInstructions: string
  discountCode: string
  discountApplied: boolean
  queuedSessions: QueuedWalletSession[]
  beneficiaries: any[]
  onOwnerFullNameChange: (value: string) => void
  onOwnerEnsNameChange: (value: string) => void
  onOwnerAddressChange: (value: string) => void
  onOwnerCityChange: (value: string) => void
  onOwnerStateChange: (value: string) => void
  onOwnerZipCodeChange: (value: string) => void
  onOwnerPhoneChange: (value: string) => void
  onExecutorNameChange: (value: string) => void
  onExecutorAddressChange: (value: string) => void
  onExecutorPhoneChange: (value: string) => void
  onExecutorEmailChange: (value: string) => void
  onExecutorTwitterChange: (value: string) => void
  onExecutorLinkedInChange: (value: string) => void
  onKeyInstructionsChange: (value: string) => void
  onDiscountCodeChange: (value: string) => void
  onDiscountCodeApply: (code: string) => void
  onCreateInvoice: () => Promise<void>
  onStepChange: (step: Step) => void
  onError: (error: string | null) => void
}

export function DetailsStep({
  ownerFullName,
  ownerEnsName,
  ownerAddress,
  ownerCity,
  ownerState,
  ownerZipCode,
  ownerPhone,
  executorName,
  executorAddress,
  executorPhone,
  executorEmail,
  executorTwitter,
  executorLinkedIn,
  keyInstructions,
  discountCode,
  discountApplied,
  queuedSessions,
  beneficiaries,
  onOwnerFullNameChange,
  onOwnerEnsNameChange,
  onOwnerAddressChange,
  onOwnerCityChange,
  onOwnerStateChange,
  onOwnerZipCodeChange,
  onOwnerPhoneChange,
  onExecutorNameChange,
  onExecutorAddressChange,
  onExecutorPhoneChange,
  onExecutorEmailChange,
  onExecutorTwitterChange,
  onExecutorLinkedInChange,
  onKeyInstructionsChange,
  onDiscountCodeChange,
  onDiscountCodeApply,
  onCreateInvoice,
  onStepChange,
  onError,
}: DetailsStepProps) {
  const [executorEnsName, setExecutorEnsName] = useState<string | null>(null)
  const [executorResolvedAddress, setExecutorResolvedAddress] = useState<string | null>(null)
  const { resolveENS, resolveENSAddress } = useENSResolution()
  const { validatePaymentForm } = useFormValidation()

  // Resolve executor ENS name
  useEffect(() => {
    const resolveExecutorENS = async () => {
      if (!executorAddress || executorAddress.trim().length === 0) {
        setExecutorEnsName(null)
        setExecutorResolvedAddress(null)
        return
      }

      const input = executorAddress.trim()
      setExecutorEnsName(null)
      setExecutorResolvedAddress(null)

      try {
        if (input.endsWith('.eth')) {
          const address = await resolveENSAddress(input)
          if (address) {
            setExecutorResolvedAddress(address)
            setExecutorEnsName(input)
          }
        } else if (input.startsWith('0x') && input.length === 42) {
          const resolved = await resolveENS(input)
          if (resolved) {
            setExecutorEnsName(resolved)
            setExecutorResolvedAddress(input.toLowerCase())
          } else {
            setExecutorResolvedAddress(input.toLowerCase())
          }
        }
      } catch (error) {
        console.error('Error resolving executor ENS:', error)
      }
    }

    const timeoutId = setTimeout(resolveExecutorENS, 500)
    return () => clearTimeout(timeoutId)
  }, [executorAddress, resolveENS, resolveENSAddress])

  const handleDiscountCode = () => {
    onDiscountCodeApply(discountCode)
  }

  const getPaymentValidationErrors = () => {
    return validatePaymentForm(
      {
        ownerFullName,
        ownerAddress,
        ownerCity,
        ownerState,
        ownerZipCode,
        ownerPhone,
      },
      {
        executorName,
        executorAddress,
        executorPhone,
        executorEmail,
      },
      beneficiaries,
      queuedSessions,
      keyInstructions
    )
  }

  const canProceedToPayment = () => {
    return getPaymentValidationErrors().length === 0
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Enter Details</h2>
      <p className="text-gray-600 mb-8">
        Provide information about yourself, your executor, and instructions for accessing your assets
      </p>

      <div className="space-y-6">
        {/* Owner Information */}
        <div className="border-b pb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Owner Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Legal Name *</label>
              <input
                type="text"
                value={ownerFullName}
                onChange={(e) => onOwnerFullNameChange(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="John Michael Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ENS Address (Optional)</label>
              <input
                type="text"
                value={ownerEnsName}
                onChange={(e) => onOwnerEnsNameChange(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="yourname.eth"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Street Address *</label>
              <input
                type="text"
                value={ownerAddress}
                onChange={(e) => onOwnerAddressChange(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">City *</label>
                <input
                  type="text"
                  value={ownerCity}
                  onChange={(e) => onOwnerCityChange(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="Nashville"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">State *</label>
                <input
                  type="text"
                  value={ownerState}
                  onChange={(e) => onOwnerStateChange(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="TN"
                  maxLength={2}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ZIP Code *</label>
              <input
                type="text"
                value={ownerZipCode}
                onChange={(e) => onOwnerZipCodeChange(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="37203"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
              <input
                type="tel"
                value={ownerPhone}
                onChange={(e) => onOwnerPhoneChange(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="(615) 555-1234"
              />
            </div>
          </div>
        </div>

        {/* Executor Information */}
        <div className="border-b pb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Executor Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Executor Full Name *</label>
              <input
                type="text"
                value={executorName}
                onChange={(e) => onExecutorNameChange(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="Jane Marie Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Executor Wallet Address *</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={executorAddress}
                    onChange={(e) => onExecutorAddressChange(e.target.value)}
                    className="flex-1 rounded-lg border-2 border-gray-300 p-3 font-mono text-sm focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="0x... or name.eth"
                  />
                  {executorAddress && (
                    <CopyButton text={executorAddress} size="md" />
                  )}
                </div>
                {executorEnsName && executorResolvedAddress && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-green-800">{executorEnsName}</span>
                      <CopyButton text={executorResolvedAddress} size="sm" />
                    </div>
                    <p className="text-xs text-gray-600 font-mono break-all">{executorResolvedAddress}</p>
                    <div className="mt-2 hidden md:block">
                      <QRCodeDisplay data={executorResolvedAddress} size={120} />
                    </div>
                  </div>
                )}
                {!executorEnsName && executorResolvedAddress && (
                  <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm text-gray-600 font-mono break-all flex-1">{executorResolvedAddress}</p>
                      <CopyButton text={executorResolvedAddress} size="sm" />
                    </div>
                    <div className="mt-2 hidden md:block">
                      <QRCodeDisplay data={executorResolvedAddress} size={120} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Executor Phone *</label>
                <input
                  type="tel"
                  value={executorPhone}
                  onChange={(e) => onExecutorPhoneChange(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="(615) 555-5678"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Executor Email *</label>
                <input
                  type="email"
                  value={executorEmail}
                  onChange={(e) => onExecutorEmailChange(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="jane@example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Twitter / X (Optional)</label>
                <input
                  type="text"
                  value={executorTwitter}
                  onChange={(e) => onExecutorTwitterChange(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="@username"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">LinkedIn (Optional)</label>
                <input
                  type="text"
                  value={executorLinkedIn}
                  onChange={(e) => onExecutorLinkedInChange(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="linkedin.com/in/username"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Key Instructions */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Instructions for Executor *
          </label>
          <p className="text-xs text-gray-500 mb-2">
            These instructions are for your executor, who should already be aware of this document and know where to find it. Provide clear instructions for locating keys, seed phrases, or accessing wallets.
          </p>
          <textarea
            value={keyInstructions}
            onChange={(e) => onKeyInstructionsChange(e.target.value)}
            className="w-full rounded-lg border-2 border-gray-300 p-3 h-40 focus:border-blue-500 focus:outline-none transition-colors resize-none"
            placeholder="Example: The seed phrase is stored in a safety deposit box at First National Bank, box #123. The key is with my attorney, John Smith, at 456 Legal Ave. The hardware wallet is in my home safe, combination is also in that box."
          />
        </div>

        {/* Discount Code */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Discount Code (Optional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={discountCode}
              onChange={(e) => {
                onDiscountCodeChange(e.target.value)
                onError(null)
              }}
              onBlur={handleDiscountCode}
              className="flex-1 rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors uppercase"
              placeholder="Enter discount code"
            />
            <button
              onClick={handleDiscountCode}
              className="px-4 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
            >
              Apply
            </button>
          </div>
          {discountApplied && (
            <p className="mt-2 text-sm text-green-600 font-semibold">✓ Discount applied! 100% off</p>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {!canProceedToPayment() && (
        <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
          <p className="text-sm font-semibold text-yellow-900 mb-2">
            ⚠️ Please complete the following to unlock PDF generation:
          </p>
          <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
            {getPaymentValidationErrors().map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex gap-4">
        <button
          onClick={() => onStepChange('allocate')}
          className="flex-1 rounded-lg border-2 border-gray-300 p-4 font-semibold hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          aria-label="Go back to allocation step"
        >
          ← Back
        </button>
        <button
          onClick={onCreateInvoice}
          disabled={!canProceedToPayment()}
          className="flex-1 rounded-lg bg-blue-600 text-white p-4 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          title={!canProceedToPayment() ? `Missing: ${getPaymentValidationErrors().join(', ')}` : ''}
          aria-label={discountApplied ? 'Unlock and generate PDF for free' : 'Unlock and generate PDF for 0.000025 ETH'}
          aria-describedby={!canProceedToPayment() ? 'payment-validation-errors' : undefined}
        >
          {discountApplied ? 'Unlock & Generate (FREE)' : 'Unlock & Generate (0.000025 ETH)'} →
        </button>
      </div>
      {!canProceedToPayment() && (
        <div id="payment-validation-errors" className="sr-only">
          Missing required fields: {getPaymentValidationErrors().join(', ')}
        </div>
      )}
    </div>
  )
}

