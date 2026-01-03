'use client'

import { useState } from 'react'
import { generatePDF } from '@/lib/pdf-generator'
import { SuccessAnimation } from '@/components/ui/SuccessAnimation'
import { ExportOptions } from '@/components/ExportOptions'
import { ExportData } from '@/lib/exportUtils'
import { UserData, QueuedWalletSession, Asset } from '@/types'
import { analytics } from '@/lib/analytics'

interface DownloadStepProps {
  paymentVerified: boolean
  discountApplied: boolean
  queuedSessions: QueuedWalletSession[]
  ownerName: string
  ownerFullName: string
  ownerEnsName: string
  ownerAddress: string
  ownerCity: string
  ownerState: string
  ownerZipCode: string
  ownerPhone: string
  executorName: string
  executorAddress: string
  executorResolvedAddress: string | null
  executorPhone: string
  executorEmail: string
  executorTwitter: string
  executorLinkedIn: string
  beneficiaries: any[]
  keyInstructions: string
  walletNames: Record<string, string>
  resolvedEnsNames: Record<string, string>
  onStepChange: (step: 'payment') => void
  onError: (error: string | null) => void
}

export function DownloadStep({
  paymentVerified,
  discountApplied,
  queuedSessions,
  ownerName,
  ownerFullName,
  ownerEnsName,
  ownerAddress,
  ownerCity,
  ownerState,
  ownerZipCode,
  ownerPhone,
  executorName,
  executorAddress,
  executorResolvedAddress,
  executorPhone,
  executorEmail,
  executorTwitter,
  executorLinkedIn,
  beneficiaries,
  keyInstructions,
  walletNames,
  resolvedEnsNames,
  onStepChange,
  onError,
}: DownloadStepProps) {
  const handleDownloadPDF = async () => {
    if (!paymentVerified && !discountApplied) {
      onError('Payment must be verified or discount applied before downloading PDF')
      return
    }

    // Merge all queued sessions
    const allQueuedAssets = queuedSessions.flatMap(s => s.assets)
    const allQueuedAllocations = queuedSessions.flatMap(s => s.allocations)

    // Collect all unique EVM addresses from queued sessions
    const allEVMAddresses = new Set<string>()
    allQueuedAssets.forEach(asset => {
      if (asset.chain !== 'bitcoin' && asset.walletAddress && asset.walletAddress.startsWith('0x')) {
        allEVMAddresses.add(asset.walletAddress)
      }
    })

    // Add queued wallet addresses
    queuedSessions.forEach(session => {
      if (session.walletType === 'evm') {
        allEVMAddresses.add(session.walletAddress)
      }
    })

    // Get Bitcoin address from queued sessions
    const btcAddressFromQueue = queuedSessions.find(s => s.walletType === 'btc')?.walletAddress || null

    // Create a map of wallet address to provider from assets and sessions
    const walletProviderMap: Record<string, string> = {}
    allQueuedAssets.forEach(asset => {
      if (asset.walletAddress && asset.walletProvider) {
        walletProviderMap[asset.walletAddress] = asset.walletProvider
      }
    })
    queuedSessions.forEach(session => {
      if (session.walletAddress && session.walletProvider) {
        walletProviderMap[session.walletAddress] = session.walletProvider
      }
    })

    const userData: UserData = {
      ownerName,
      ownerFullName,
      ownerEnsName: ownerEnsName || undefined,
      ownerAddress,
      ownerCity,
      ownerState,
      ownerZipCode,
      ownerPhone,
      executorName,
      executorAddress: executorResolvedAddress || executorAddress,
      executorPhone: executorPhone || undefined,
      executorEmail: executorEmail || undefined,
      executorTwitter: executorTwitter || undefined,
      executorLinkedIn: executorLinkedIn || undefined,
      beneficiaries,
      allocations: allQueuedAllocations,
      keyInstructions,
      connectedWallets: {
        evm: Array.from(allEVMAddresses),
        btc: btcAddressFromQueue || undefined,
      },
      walletNames,
      resolvedEnsNames,
    }

    try {
      onError(null)
      const pdfBytes = await generatePDF(userData, allQueuedAssets, walletProviderMap)
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      // Create iframe for printing
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = url
      document.body.appendChild(iframe)

      // Wait for iframe to load, then trigger print
      iframe.onload = () => {
        setTimeout(() => {
          try {
            if (iframe.contentWindow) {
              iframe.contentWindow.focus()
              iframe.contentWindow.print()
            }
          } catch (e) {
            console.error('Error printing from iframe:', e)
          }
        }, 1000)
      }

      // Also download the file automatically
      const a = document.createElement('a')
      a.href = url
      a.download = `lastwish-crypto-instructions-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Clean up iframe and URL after printing
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe)
        }
      URL.revokeObjectURL(url)
    }, 5000)

    // Track success
    setPdfGenerated(true)
    setShowSuccess(true)
    analytics.trackPDFGeneration()
    } catch (error) {
      console.error('Error generating PDF:', error)
      onError('Failed to generate PDF. Please try again.')
      analytics.trackError('PDF generation failed', { step: 'download' })
    }
  }

  // Prepare export data
  const exportData: ExportData = {
    version: '1.0.0',
    timestamp: Date.now(),
    ownerData: {
      ownerName,
      ownerFullName,
      ownerEnsName,
      ownerAddress,
      ownerCity,
      ownerState,
      ownerZipCode,
      ownerPhone,
    },
    executorData: {
      executorName,
      executorAddress: executorResolvedAddress || executorAddress,
      executorPhone,
      executorEmail,
      executorTwitter,
      executorLinkedIn,
    },
    beneficiaries,
    queuedSessions,
    keyInstructions,
  }

  if (!paymentVerified && !discountApplied) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-yellow-900 mb-4">Payment Required</h2>
          <p className="text-yellow-800 mb-4">
            Please complete payment or apply a discount code to download your document.
          </p>
          <button
            onClick={() => onStepChange('payment')}
            className="px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Go to Payment Step
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto text-center">
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Document Ready!</h2>
      <p className="text-gray-600 mb-8">
        Your crypto inheritance instructions document is ready to download
      </p>

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-8 border-2 border-green-200">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-900 mb-2">
            {discountApplied ? 'Discount Applied - FREE' : 'Payment Verified'}
          </p>
          <p className="text-sm text-gray-600">
            Your document has been generated and is ready to download
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="w-full rounded-lg bg-blue-600 text-white p-4 font-semibold hover:bg-blue-700 transition-colors shadow-lg mb-4"
        >
          {pdfGenerated ? 'Download PDF Again' : 'Download PDF'}
        </button>
        <p className="text-xs text-gray-500 mb-4">
          Print this document and have it notarized. Keep it in a safe place.
        </p>

        {/* Export Options */}
        <div className="mt-6 pt-6 border-t border-green-200">
          <ExportOptions exportData={exportData} />
        </div>
      </div>

      {/* Success Animation */}
      <SuccessAnimation
        show={showSuccess}
        message="PDF Generated Successfully!"
        onComplete={() => setShowSuccess(false)}
      />
    </div>
  )
}

