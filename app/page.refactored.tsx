'use client'

// Disable static generation - this page requires client-side only features
export const dynamic = 'force-dynamic'
export const dynamicParams = true

import { useState, useEffect } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { ConnectStep } from '@/components/steps/ConnectStep'
import { AssetsStep } from '@/components/steps/AssetsStep'
import { AllocateStep } from '@/components/steps/AllocateStep'
import { DetailsStep } from '@/components/steps/DetailsStep'
import { PaymentStep } from '@/components/steps/PaymentStep'
import { DownloadStep } from '@/components/steps/DownloadStep'
import { ProgressSteps } from '@/components/ui/ProgressSteps'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { useLocalStorage } from '@/components/hooks/useLocalStorage'
import { useWalletConnection } from '@/components/hooks/useWalletConnection'
import { useAssetLoading } from '@/components/hooks/useAssetLoading'
import { useENSResolution } from '@/components/hooks/useENSResolution'
import { usePaymentVerification } from '@/components/hooks/usePaymentVerification'
import { Step, StepConfig, Asset, Beneficiary, Allocation, QueuedWalletSession } from '@/types'
import axios from 'axios'

const steps: StepConfig[] = [
  { id: 'connect', label: 'Connect', number: 1 },
  { id: 'assets', label: 'Assets', number: 2 },
  { id: 'allocate', label: 'Allocate', number: 3 },
  { id: 'details', label: 'Details', number: 4 },
  { id: 'payment', label: 'Payment', number: 5 },
  { id: 'download', label: 'Download', number: 6 },
]

export default function Home() {
  const { isConnected, disconnect } = useAccount()
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showStartOverDialog, setShowStartOverDialog] = useState(false)

  // Step management
  const [step, setStep] = useLocalStorage<Step>('lastwish_step', 'connect')

  // Owner data
  const [ownerName, setOwnerName] = useLocalStorage<string>('lastwish_ownerName', '')
  const [ownerFullName, setOwnerFullName] = useLocalStorage<string>('lastwish_ownerFullName', '')
  const [ownerEnsName, setOwnerEnsName] = useLocalStorage<string>('lastwish_ownerEnsName', '')
  const [ownerAddress, setOwnerAddress] = useLocalStorage<string>('lastwish_ownerAddress', '')
  const [ownerCity, setOwnerCity] = useLocalStorage<string>('lastwish_ownerCity', '')
  const [ownerState, setOwnerState] = useLocalStorage<string>('lastwish_ownerState', '')
  const [ownerZipCode, setOwnerZipCode] = useLocalStorage<string>('lastwish_ownerZipCode', '')
  const [ownerPhone, setOwnerPhone] = useLocalStorage<string>('lastwish_ownerPhone', '')

  // Executor data
  const [executorName, setExecutorName] = useLocalStorage<string>('lastwish_executorName', '')
  const [executorAddress, setExecutorAddress] = useLocalStorage<string>('lastwish_executorAddress', '')
  const [executorPhone, setExecutorPhone] = useLocalStorage<string>('lastwish_executorPhone', '')
  const [executorEmail, setExecutorEmail] = useLocalStorage<string>('lastwish_executorEmail', '')
  const [executorTwitter, setExecutorTwitter] = useLocalStorage<string>('lastwish_executorTwitter', '')
  const [executorLinkedIn, setExecutorLinkedIn] = useLocalStorage<string>('lastwish_executorLinkedIn', '')
  const [executorResolvedAddress, setExecutorResolvedAddress] = useState<string | null>(null)

  // Other data
  const [keyInstructions, setKeyInstructions] = useLocalStorage<string>('lastwish_keyInstructions', '')
  const [beneficiaries, setBeneficiaries] = useLocalStorage<Beneficiary[]>('lastwish_beneficiaries', [])
  const [allocations, setAllocations] = useLocalStorage<Allocation[]>('lastwish_allocations', [])
  const [queuedSessions, setQueuedSessions] = useLocalStorage<QueuedWalletSession[]>('lastwish_queuedSessions', [])
  const [walletNames, setWalletNames] = useLocalStorage<Record<string, string>>('lastwish_walletNames', {})
  const [selectedWalletForLoading, setSelectedWalletForLoading] = useState<string | null>(null)

  // Hooks
  const walletConnection = useWalletConnection()
  const assetLoading = useAssetLoading()
  const ensResolution = useENSResolution()
  const paymentVerification = usePaymentVerification()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Resolve executor ENS
  useEffect(() => {
    const resolveExecutorENS = async () => {
      if (!executorAddress || executorAddress.trim().length === 0) {
        setExecutorResolvedAddress(null)
        return
      }

      const input = executorAddress.trim()
      setExecutorResolvedAddress(null)

      try {
        if (input.endsWith('.eth')) {
          const address = await ensResolution.resolveENSAddress(input)
          if (address) {
            setExecutorResolvedAddress(address)
          }
        } else if (input.startsWith('0x') && input.length === 42) {
          const resolved = await ensResolution.resolveENS(input)
          if (resolved) {
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
  }, [executorAddress, ensResolution])

  // Handle save to queue
  const handleSaveToQueue = () => {
    const walletAddress = walletConnection.evmAddress || walletConnection.btcAddress
    if (!walletAddress) {
      setError('No wallet connected. Please connect a wallet first.')
      return
    }

    if (assetLoading.selectedAssetIds.length === 0) {
      setError('Please select at least one asset to save to queue.')
      return
    }

    const sessionAllocations = allocations.filter(a => assetLoading.selectedAssetIds.includes(a.assetId))
    if (sessionAllocations.length === 0) {
      setError('Please allocate assets to beneficiaries before saving to queue.')
      return
    }

    if (queuedSessions.length >= 20) {
      setError('Maximum 20 wallets allowed. Please remove a queued wallet first.')
      return
    }

    if (queuedSessions.some(s => s.walletAddress.toLowerCase() === walletAddress.toLowerCase())) {
      setError('This wallet is already in the queue. Please disconnect and connect a different wallet.')
      return
    }

    const sessionAssets = assetLoading.assets.filter(a => assetLoading.selectedAssetIds.includes(a.id))

    const session: QueuedWalletSession = {
      id: `${walletAddress.toLowerCase()}-${Date.now()}`,
      walletAddress: walletAddress.toLowerCase(),
      walletType: walletConnection.evmAddress ? 'evm' : 'btc',
      walletProvider: walletConnection.evmAddress ? (walletConnection.walletProviders[walletConnection.evmAddress] || 'Unknown') : 'Xverse',
      ensName: walletConnection.evmAddress ? (ensResolution.resolvedEnsNames[walletConnection.evmAddress.toLowerCase()] || undefined) : undefined,
      assets: sessionAssets,
      allocations: sessionAllocations,
      verified: walletConnection.evmAddress ? walletConnection.isVerified(walletConnection.evmAddress) : true,
      createdAt: Date.now()
    }

    setQueuedSessions([...queuedSessions, session])
    assetLoading.clearAssets()
    setAllocations([])
    setSelectedWalletForLoading(null)

    if (walletConnection.evmAddress) {
      walletConnection.removeEVMAddress(walletConnection.evmAddress)
      if (isConnected) {
        disconnect()
      }
    }
    if (walletConnection.btcAddress) {
      walletConnection.setBtcAddress(null)
    }

    setError(null)
    setStep('connect')
  }

  // Handle create invoice
  const handleCreateInvoice = async () => {
    try {
      setError(null)
      const result = await paymentVerification.createInvoice()
      if (result.discountApplied) {
        setStep('download')
      } else {
        setStep('payment')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create invoice. Please try again.')
    }
  }

  // Handle discount code
  const handleDiscountCode = (code: string) => {
    paymentVerification.applyDiscountCode(code)
  }

  // Handle start over
  const handleStartOver = () => {
    walletConnection.clearAllWallets()
    assetLoading.clearAssets()
    setBeneficiaries([])
    setAllocations([])
    setQueuedSessions([])
    setOwnerName('')
    setOwnerFullName('')
    setOwnerEnsName('')
    setOwnerAddress('')
    setOwnerCity('')
    setOwnerState('')
    setOwnerZipCode('')
    setOwnerPhone('')
    setExecutorName('')
    setExecutorAddress('')
    setExecutorPhone('')
    setExecutorEmail('')
    setExecutorTwitter('')
    setExecutorLinkedIn('')
    setKeyInstructions('')
    setWalletNames({})
    setError(null)
    setStep('connect')
    if (typeof window !== 'undefined') {
      localStorage.clear()
    }
    setShowStartOverDialog(false)
  }

  // Navigation helper
  const canNavigateToStep = (targetStep: Step): boolean => {
    const currentIndex = steps.findIndex(s => s.id === step)
    const targetIndex = steps.findIndex(s => s.id === targetStep)

    if (targetIndex < 4) return true // Steps 1-4 are free navigation
    if (targetStep === 'payment') return paymentVerification.invoiceId !== null || paymentVerification.discountApplied
    if (targetStep === 'download') return paymentVerification.paymentVerified || paymentVerification.discountApplied
    return false
  }

  if (!mounted) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-200 to-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="text-center mb-12 relative">
          <div className="absolute top-0 right-0">
            <button
              onClick={() => setShowStartOverDialog(true)}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
            >
              ↻ Start Over
            </button>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-3">LastWish.eth</h1>
          <div className="max-w-2xl mx-auto mb-6 space-y-3">
            <p className="text-lg text-gray-600 font-semibold">
              Do you really want to take your crypto to the grave with you by accident?
            </p>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>We don't ask for seed phrases or private keys.</strong>
              </p>
              <p className="text-xs text-gray-600 mb-2">
                Nothing is saved, you create a stateless PDF document, you can save it and/or print it on the spot. <strong>We suggest you do both.</strong>
              </p>
            </div>
            <p className="text-sm text-gray-500">
              Secure crypto inheritance instructions • 0.000025 ETH one-time fee
            </p>
            <div className="mt-4">
              <a
                href="/guide"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-blue-600 hover:text-blue-700 font-semibold text-sm underline"
              >
                📖 View Complete User Guide & Statistics →
              </a>
            </div>
          </div>
        </header>

        {/* Progress Steps */}
        <ProgressSteps
          steps={steps}
          currentStep={step}
          onStepClick={setStep}
          canNavigateToStep={canNavigateToStep}
        />

        {/* Main Content */}
        <main className="bg-gray-100 rounded-xl shadow-xl p-8 md:p-12">
          <ErrorMessage message={error || ''} onDismiss={() => setError(null)} />

          {step === 'connect' && (
            <ConnectStep
              queuedSessions={queuedSessions}
              onQueuedSessionsChange={setQueuedSessions}
              onStepChange={setStep}
              resolvedEnsNames={ensResolution.resolvedEnsNames}
              walletNames={walletNames}
              assets={assetLoading.assets}
              onClearAssets={assetLoading.clearAssets}
            />
          )}

          {step === 'assets' && (
            <AssetsStep
              assets={assetLoading.assets}
              selectedAssetIds={assetLoading.selectedAssetIds}
              onSelectionChange={assetLoading.setSelectedAssetIds}
              loading={assetLoading.loading}
              selectedWalletForLoading={selectedWalletForLoading}
              btcAddress={walletConnection.btcAddress}
              resolvedEnsNames={ensResolution.resolvedEnsNames}
              walletNames={walletNames}
              walletProviders={walletConnection.walletProviders}
              onStepChange={setStep}
            />
          )}

          {step === 'allocate' && (
            <AllocateStep
              assets={assetLoading.assets}
              selectedAssetIds={assetLoading.selectedAssetIds}
              beneficiaries={beneficiaries}
              onBeneficiariesChange={setBeneficiaries}
              allocations={allocations}
              onAllocationsChange={setAllocations}
              queuedSessions={queuedSessions}
              onSaveToQueue={handleSaveToQueue}
              onStepChange={setStep}
            />
          )}

          {step === 'details' && (
            <DetailsStep
              ownerFullName={ownerFullName}
              ownerEnsName={ownerEnsName}
              ownerAddress={ownerAddress}
              ownerCity={ownerCity}
              ownerState={ownerState}
              ownerZipCode={ownerZipCode}
              ownerPhone={ownerPhone}
              executorName={executorName}
              executorAddress={executorAddress}
              executorPhone={executorPhone}
              executorEmail={executorEmail}
              executorTwitter={executorTwitter}
              executorLinkedIn={executorLinkedIn}
              keyInstructions={keyInstructions}
              discountCode={paymentVerification.discountCode}
              discountApplied={paymentVerification.discountApplied}
              queuedSessions={queuedSessions}
              beneficiaries={beneficiaries}
              onOwnerFullNameChange={setOwnerFullName}
              onOwnerEnsNameChange={setOwnerEnsName}
              onOwnerAddressChange={setOwnerAddress}
              onOwnerCityChange={setOwnerCity}
              onOwnerStateChange={setOwnerState}
              onOwnerZipCodeChange={setOwnerZipCode}
              onOwnerPhoneChange={setOwnerPhone}
              onExecutorNameChange={setExecutorName}
              onExecutorAddressChange={setExecutorAddress}
              onExecutorPhoneChange={setExecutorPhone}
              onExecutorEmailChange={setExecutorEmail}
              onExecutorTwitterChange={setExecutorTwitter}
              onExecutorLinkedInChange={setExecutorLinkedIn}
              onKeyInstructionsChange={setKeyInstructions}
              onDiscountCodeChange={paymentVerification.setDiscountCode}
              onDiscountCodeApply={handleDiscountCode}
              onCreateInvoice={handleCreateInvoice}
              onStepChange={setStep}
              onError={setError}
            />
          )}

          {step === 'payment' && paymentVerification.invoiceId && (
            <PaymentStep
              invoiceId={paymentVerification.invoiceId}
              paymentWalletAddress={walletConnection.evmAddress}
              onStepChange={setStep}
              onError={setError}
              onPaymentVerified={() => {
                paymentVerification.setPaymentVerified(true)
              }}
            />
          )}

          {step === 'download' && (
            <DownloadStep
              paymentVerified={paymentVerification.paymentVerified}
              discountApplied={paymentVerification.discountApplied}
              queuedSessions={queuedSessions}
              ownerName={ownerName}
              ownerFullName={ownerFullName}
              ownerEnsName={ownerEnsName}
              ownerAddress={ownerAddress}
              ownerCity={ownerCity}
              ownerState={ownerState}
              ownerZipCode={ownerZipCode}
              ownerPhone={ownerPhone}
              executorName={executorName}
              executorAddress={executorAddress}
              executorResolvedAddress={executorResolvedAddress}
              executorPhone={executorPhone}
              executorEmail={executorEmail}
              executorTwitter={executorTwitter}
              executorLinkedIn={executorLinkedIn}
              beneficiaries={beneficiaries}
              keyInstructions={keyInstructions}
              walletNames={walletNames}
              resolvedEnsNames={ensResolution.resolvedEnsNames}
              onStepChange={setStep}
              onError={setError}
            />
          )}
        </main>

        <footer className="mt-12 text-center text-sm text-gray-500">
          <p className="mb-2">
            LastWish is a backup plan tool. It does not store your keys or execute transactions.
          </p>
          <p>
            This document is for informational purposes only and does not constitute legal advice.
          </p>
        </footer>
      </div>

      {/* Start Over Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showStartOverDialog}
        title="Start Over?"
        message="This will disconnect all wallets, clear all verifications, and reset everything to the beginning. This cannot be undone."
        confirmText="Start Over"
        cancelText="Cancel"
        onConfirm={handleStartOver}
        onCancel={() => setShowStartOverDialog(false)}
        variant="danger"
      />
    </div>
  )
}

