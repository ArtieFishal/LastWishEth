'use client'

import { useState } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { mainnet } from 'viem/chains'
import { usePaymentVerification } from '@/components/hooks/usePaymentVerification'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Step } from '@/types'
import axios from 'axios'

interface PaymentStepProps {
  invoiceId: string | null
  paymentWalletAddress: string | null
  onStepChange: (step: Step) => void
  onError: (error: string | null) => void
  onPaymentVerified: () => void
}

export function PaymentStep({
  invoiceId,
  paymentWalletAddress,
  onStepChange,
  onError,
  onPaymentVerified,
}: PaymentStepProps) {
  const { isConnected, address: evmAddress, chain } = useAccount()
  const { connect, connectors } = useConnect()
  const [verifyingPayment, setVerifyingPayment] = useState(false)

  const {
    paymentRecipientAddress,
    paymentVerified,
    sendTxHash,
    isSendingPayment,
    isConfirming,
    isPaymentSent,
    sendError,
    sendPayment,
    verifyPayment,
  } = usePaymentVerification()

  const handleSendPayment = async () => {
    try {
      onError(null)
      await sendPayment()
    } catch (error: any) {
      onError(error.message || 'Failed to send payment')
    }
  }

  const handleVerifyPayment = async () => {
    const walletToUse = paymentWalletAddress || evmAddress
    if (!walletToUse) {
      onError('Please connect the wallet you used to send the payment.')
      return
    }

    setVerifyingPayment(true)
    onError(null)
    try {
      const verified = await verifyPayment(walletToUse)
      if (verified) {
        onPaymentVerified()
        onStepChange('download')
      } else {
        onError('Payment not yet confirmed. Make sure you sent the payment from the connected wallet and wait a moment for confirmation.')
      }
    } catch (error: any) {
      onError(error?.response?.data?.error || 'Failed to verify payment.')
    } finally {
      setVerifyingPayment(false)
    }
  }

  const handleProceedAfterPayment = () => {
    onPaymentVerified()
    onStepChange('download')
  }

  const isUserRejection = sendError?.message?.includes('User rejected') ||
    sendError?.message?.includes('User denied') ||
    sendError?.message?.includes('rejected') ||
    sendError?.message?.includes('denied transaction signature')

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Required</h2>
      <p className="text-gray-600 mb-8">
        Pay 0.000025 ETH to unlock PDF generation
      </p>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 border-2 border-blue-200">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Amount</p>
            <p className="text-2xl font-bold text-gray-900">0.000025 ETH</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Token</p>
            <p className="text-lg font-semibold text-gray-900">Native ETH on Ethereum Mainnet</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Recipient</p>
            <p className="text-lg font-mono text-gray-900 break-all">lastwish.eth</p>
          </div>

          {/* Status Messages */}
          {isConnected && chain?.id === mainnet.id && paymentRecipientAddress && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>✓ Ready to Pay:</strong> Click "Send Payment" below to send 0.000025 ETH directly from your connected wallet.
              </p>
            </div>
          )}

          {!isConnected && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>Connect Wallet Required:</strong> Please connect your wallet to send payment directly from this page.
              </p>
            </div>
          )}

          {isConnected && chain?.id !== mainnet.id && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800">
                <strong>Wrong Network:</strong> Please switch to Ethereum Mainnet to send payment.
              </p>
            </div>
          )}

          {isSendingPayment && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Sending Payment...</strong> Please confirm the transaction in your wallet.
              </p>
            </div>
          )}

          {isConfirming && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Transaction Pending...</strong> Waiting for confirmation. This may take a few moments.
              </p>
            </div>
          )}

          {isPaymentSent && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>✓ Payment Sent!</strong> Transaction confirmed. Verifying payment...
              </p>
            </div>
          )}

          {sendError && (
            <div className={isUserRejection ? "bg-yellow-50 border border-yellow-200 rounded-lg p-4" : "bg-red-50 border border-red-200 rounded-lg p-4"}>
              <p className="text-sm mb-2" style={{ color: isUserRejection ? '#92400e' : '#991b1b' }}>
                <strong>{isUserRejection ? 'Transaction Cancelled:' : 'Transaction Error:'}</strong> {isUserRejection ? 'You cancelled the transaction. Click the button below to try again.' : sendError.message || 'Failed to send payment'}
              </p>
              {!isUserRejection && (
                <p className="text-xs text-red-700">
                  If you're seeing a gas error but have enough ETH, try:
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Make sure you're on Ethereum Mainnet (not a testnet)</li>
                    <li>Try refreshing the page and reconnecting your wallet</li>
                    <li>If using WalletConnect, try disconnecting and reconnecting via QR code</li>
                    <li>Your wallet should show the actual gas cost - you can adjust it there</li>
                  </ul>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {/* Send Payment Button */}
        {isConnected && chain?.id === mainnet.id && paymentRecipientAddress ? (
          <button
            onClick={handleSendPayment}
            disabled={isSendingPayment || isConfirming || !paymentRecipientAddress}
            className="w-full rounded-lg bg-blue-600 text-white p-4 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg"
          >
            {isSendingPayment ? 'Confirm in Wallet...' : isConfirming ? 'Confirming Transaction...' : '💳 Send Payment (0.000025 ETH)'}
          </button>
        ) : !isConnected ? (
          <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 text-center space-y-3">
            <p className="text-sm text-gray-700 mb-2">Connect your wallet to send payment directly from this page</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={async () => {
                  const walletConnectConnector = connectors?.find(c => c.name === 'WalletConnect')
                  if (walletConnectConnector) {
                    try {
                      await connect({ connector: walletConnectConnector })
                    } catch (error: any) {
                      if (!error?.message?.includes('rejected') && !error?.message?.includes('User rejected')) {
                        console.error('Error connecting:', error)
                      }
                    }
                  } else {
                    onStepChange('connect')
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Open WalletConnect QR
              </button>
              <button
                onClick={() => onStepChange('connect')}
                className="px-4 py-2 bg-gray-600 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors"
              >
                Other Options
              </button>
            </div>
          </div>
        ) : chain?.id !== mainnet.id ? (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 text-center">
            <p className="text-sm text-orange-800 mb-2">Please switch to Ethereum Mainnet to send payment</p>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleVerifyPayment}
            disabled={verifyingPayment || (!isConnected && !paymentWalletAddress)}
            className="flex-1 rounded-lg bg-green-600 text-white p-4 font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 shadow-lg"
          >
            {verifyingPayment ? 'Verifying...' : (!paymentWalletAddress && !isConnected ? 'Connect Wallet First' : 'Verify Payment')}
          </button>
          {isPaymentSent && sendTxHash && !paymentVerified && (
            <button
              onClick={handleProceedAfterPayment}
              className="flex-1 rounded-lg bg-purple-600 text-white p-4 font-semibold hover:bg-purple-700 transition-colors shadow-lg"
            >
              Proceed to Download (Payment Sent)
            </button>
          )}
          <button
            onClick={() => onStepChange('details')}
            className="flex-1 rounded-lg border-2 border-gray-300 p-4 font-semibold hover:bg-gray-50 transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  )
}

