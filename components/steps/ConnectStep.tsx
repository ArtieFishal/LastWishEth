'use client'

import { useState } from 'react'
import { WalletConnect } from '@/components/WalletConnect'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useWalletConnection } from '@/components/hooks/useWalletConnection'
import { useAssetLoading } from '@/components/hooks/useAssetLoading'
import { useENSResolution } from '@/components/hooks/useENSResolution'
import { QueuedWalletSession, Step } from '@/types'

interface ConnectStepProps {
  queuedSessions: QueuedWalletSession[]
  onQueuedSessionsChange: (sessions: QueuedWalletSession[]) => void
  onStepChange: (step: Step) => void
  resolvedEnsNames: Record<string, string>
  walletNames: Record<string, string>
  assets: any[]
  onClearAssets: () => void
}

export function ConnectStep({
  queuedSessions,
  onQueuedSessionsChange,
  onStepChange,
  resolvedEnsNames,
  walletNames,
  assets,
  onClearAssets,
}: ConnectStepProps) {
  const [selectedWalletForLoading, setSelectedWalletForLoading] = useState<string | null>(null)
  const [showClearQueueDialog, setShowClearQueueDialog] = useState(false)
  const [showClearAssetsDialog, setShowClearAssetsDialog] = useState(false)
  const [showDisconnectAllDialog, setShowDisconnectAllDialog] = useState(false)

  const {
    evmAddress,
    isConnected,
    connectedEVMAddresses,
    verifiedAddresses,
    pendingVerification,
    walletProviders,
    btcAddress,
    setBtcAddress,
    verifyWalletOwnership,
    addEVMAddress,
    removeEVMAddress,
    clearAllWallets,
    isVerified,
  } = useWalletConnection()

  const {
    assets: loadedAssets,
    loading,
    loadingProgress,
    loadAssetsFromWallet,
    loadAssetsFromMultipleWallets,
    loadBitcoinAssets,
  } = useAssetLoading()

  const { resolveENS } = useENSResolution()

  const handleRemoveQueuedSession = (sessionId: string) => {
    onQueuedSessionsChange(queuedSessions.filter(s => s.id !== sessionId))
  }

  const handleClearQueue = () => {
    onQueuedSessionsChange([])
    setShowClearQueueDialog(false)
  }

  const handleClearAssets = () => {
    onClearAssets()
    setShowClearAssetsDialog(false)
  }

  const handleDisconnectAll = () => {
    clearAllWallets()
    onClearAssets()
    setShowDisconnectAllDialog(false)
  }

  const handleLoadAssetsFromWallet = async (walletAddress: string) => {
    setSelectedWalletForLoading(walletAddress)
    await loadAssetsFromWallet(walletAddress, assets.length > 0, walletProviders[walletAddress])
    onStepChange('assets')
  }

  const handleLoadAllWallets = async () => {
    const verifiedWallets = connectedEVMAddresses.filter(addr => isVerified(addr))
    if (verifiedWallets.length > 0) {
      await loadAssetsFromMultipleWallets(verifiedWallets, assets.length > 0, walletProviders)
      onStepChange('assets')
    }
  }

  const handleBitcoinConnect = async (addr: string) => {
    if (!addr) return
    setBtcAddress(addr)
    setSelectedWalletForLoading(null)
    try {
      await loadBitcoinAssets(addr, assets.length > 0)
      onStepChange('assets')
    } catch (err) {
      console.error('Error loading Bitcoin assets after connection:', err)
    }
  }

  const handleEvmConnect = async (addr: string, provider?: string) => {
    if (addr && !connectedEVMAddresses.includes(addr)) {
      if (connectedEVMAddresses.length + queuedSessions.length >= 20) {
        throw new Error('Maximum 20 wallets allowed (including queued). Please disconnect a wallet or remove from queue first.')
      }
      addEVMAddress(addr, provider)
      if (selectedWalletForLoading === null) {
        setSelectedWalletForLoading(addr)
      }
      if (!isVerified(addr)) {
        try {
          await verifyWalletOwnership(addr)
          if (selectedWalletForLoading === null) {
            setSelectedWalletForLoading(addr)
          }
        } catch (error) {
          // User rejected or error - handled by hook
        }
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Connect Your Wallets</h2>
      <p className="text-gray-600 mb-8">
        Connect and process up to 20 wallets. Each wallet's assets will be saved to a queue after allocation.
      </p>

      {/* Queue Status */}
      {queuedSessions.length > 0 && (
        <div className="mb-8 bg-green-50 border-2 border-green-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              Queued Wallets ({queuedSessions.length}/20)
            </h3>
            {queuedSessions.length > 0 && (
              <button
                onClick={() => setShowClearQueueDialog(true)}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {queuedSessions.map((session) => {
              const totalAssets = session.assets.length
              const totalAllocations = session.allocations.length
              return (
                <div key={session.id} className="bg-gray-50 rounded-lg border border-gray-300 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm font-semibold text-gray-900">
                          {session.ensName || session.walletAddress}
                        </span>
                        {session.ensName && (
                          <span className="text-xs text-gray-500 font-mono">
                            ({session.walletAddress})
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          session.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {session.verified ? '✓ Verified' : 'Unverified'}
                        </span>
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                          {session.walletType.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold">{totalAssets}</span> asset{totalAssets !== 1 ? 's' : ''} • 
                        <span className="font-semibold"> {totalAllocations}</span> allocation{totalAllocations !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveQueuedSession(session.id)}
                      className="ml-4 px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded hover:bg-red-200 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          {queuedSessions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <button
                onClick={() => onStepChange('details')}
                disabled={queuedSessions.length === 0}
                className="w-full rounded-lg bg-blue-600 text-white p-3 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                Continue to Details ({queuedSessions.length} wallet{queuedSessions.length !== 1 ? 's' : ''} queued) →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Assets loaded indicator */}
      {assets.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-blue-800 font-semibold mb-1">
                {assets.length} asset{assets.length !== 1 ? 's' : ''} loaded from previous wallet{assets.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-blue-700">
                Connect another wallet to add more assets, or continue to review your current assets.
              </p>
            </div>
            <button
              onClick={() => setShowClearAssetsDialog(true)}
              className="ml-4 px-3 py-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors whitespace-nowrap"
            >
              Clear Assets
            </button>
          </div>
        </div>
      )}

      {/* Connected Wallets */}
      {(connectedEVMAddresses.length > 0 || btcAddress) && (
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-gray-300 pb-2">
            <h3 className="text-lg font-bold text-gray-900">
              Connected Wallets ({connectedEVMAddresses.length + (btcAddress ? 1 : 0)})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleLoadAllWallets}
                disabled={loading || connectedEVMAddresses.filter(addr => isVerified(addr)).length === 0}
                className="px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Load All Wallets'}
              </button>
              <button
                onClick={() => setShowDisconnectAllDialog(true)}
                className="px-4 py-2 text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
              >
                Disconnect All
              </button>
            </div>
          </div>

          {/* EVM Wallets */}
          {connectedEVMAddresses.map((addr) => {
            const ensName = resolvedEnsNames[addr.toLowerCase()] || walletNames[addr]
            const walletAssetCount = assets.filter(a => a.walletAddress === addr).length
            const isSelected = selectedWalletForLoading === addr
            const isVerifiedWallet = isVerified(addr)
            const walletProvider = walletProviders[addr] || 'Unknown'

            return (
              <div
                key={addr}
                className={`bg-white border-2 rounded-lg shadow-sm transition-all mb-3 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-300'
                    : isVerifiedWallet
                    ? 'border-blue-200 hover:border-blue-300 hover:shadow-md'
                    : 'border-gray-200 opacity-60'
                }`}
              >
                <div
                  onClick={() => {
                    if (isVerifiedWallet) {
                      setSelectedWalletForLoading(addr)
                    }
                  }}
                  className="p-4 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                          {walletProvider}
                        </span>
                        {isSelected && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                            ✓ Selected
                          </span>
                        )}
                        {!isVerifiedWallet && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                            ⚠ Verify Required
                          </span>
                        )}
                        {walletAssetCount > 0 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            {walletAssetCount} Asset{walletAssetCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        {ensName && ensName !== addr && (
                          <p className="text-sm font-semibold text-gray-900 mb-1 break-all">
                            {ensName}
                          </p>
                        )}
                        <p className="text-xs font-mono text-gray-700 break-all bg-gray-50 p-2 rounded border">
                          {addr}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4 flex gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeEVMAddress(addr)
                          if (evmAddress === addr) {
                            // disconnect handled by hook
                          }
                          if (selectedWalletForLoading === addr) {
                            const remaining = connectedEVMAddresses.filter(a => a !== addr && isVerified(a))
                            setSelectedWalletForLoading(remaining.length > 0 ? remaining[0] : null)
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
                      >
                        Disconnect
                      </button>
                      {isVerifiedWallet && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedWalletForLoading(addr)
                          }}
                          className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                          }`}
                        >
                          {isSelected ? '✓' : 'Select'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isVerifiedWallet && (
                  <div className="px-4 pb-4 border-t border-gray-200 pt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLoadAssetsFromWallet(addr)
                      }}
                      disabled={loading}
                      className="w-full rounded-lg bg-blue-600 text-white p-3 font-semibold hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Loading Assets...' : (walletAssetCount > 0 ? `Reload Assets from ${walletProvider}` : `Load Assets from ${walletProvider}`)}
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* Bitcoin Wallet */}
          {btcAddress && (() => {
            const btcAssets = assets.filter(a => a.chain === 'bitcoin')
            const btcAssetCount = btcAssets.length
            return (
              <div className="bg-gray-50 border-2 border-orange-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                        BITCOIN WALLET
                      </span>
                      {btcAssetCount > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          {btcAssetCount} Asset{btcAssetCount !== 1 ? 's' : ''} Loaded
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Bitcoin Address
                      </p>
                      <p className="text-sm font-mono text-gray-700 break-all bg-gray-50 p-2 rounded border">
                        {btcAddress}
                      </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold">Network:</span> Bitcoin Mainnet
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    <button
                      onClick={async () => {
                        if (btcAddress) {
                          setSelectedWalletForLoading(null)
                          await loadBitcoinAssets(btcAddress, assets.length > 0)
                          onStepChange('assets')
                        }
                      }}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg border border-orange-600 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Loading...' : 'Load Assets from Selected Wallet'}
                    </button>
                    <button
                      onClick={() => setBtcAddress(null)}
                      className="px-4 py-2 text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors whitespace-nowrap"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Wallet Connect Options */}
      <div className="mt-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-gray-300 pb-2">
          Connect Additional Wallets
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Connect more wallets to add their assets. You can connect multiple EVM wallets and Bitcoin wallets.
        </p>
        <WalletConnect
          onBitcoinConnect={handleBitcoinConnect}
          onEvmConnect={handleEvmConnect}
        />
      </div>

      {/* Verification Status */}
      {isConnected && evmAddress && !isVerified(evmAddress) && (
        <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
          <p className="text-sm font-semibold text-yellow-800 mb-2">
            🔒 Wallet Verification Required
          </p>
          <p className="text-xs text-yellow-700 mb-3">
            To protect your security, we need to verify you own this wallet by signing a message. This proves you control the wallet and prevents unauthorized access.
          </p>
          {pendingVerification === evmAddress ? (
            <p className="text-xs text-yellow-600">
              ⏳ Waiting for signature in your wallet...
            </p>
          ) : (
            <button
              onClick={() => verifyWalletOwnership(evmAddress)}
              className="w-full rounded-lg bg-yellow-600 text-white p-3 font-semibold hover:bg-yellow-700 transition-all"
            >
              Verify Wallet Ownership (Sign Message)
            </button>
          )}
        </div>
      )}

      {/* Selected Wallet Actions */}
      {selectedWalletForLoading && isVerified(selectedWalletForLoading) && !loading && (
        <div className="mt-8 space-y-3">
          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 mb-1">
              Selected Wallet:
            </p>
            <p className="text-xs text-blue-700 font-mono break-all">
              {resolvedEnsNames[selectedWalletForLoading.toLowerCase()] || walletNames[selectedWalletForLoading] || selectedWalletForLoading}
            </p>
          </div>
          <button
            onClick={() => handleLoadAssetsFromWallet(selectedWalletForLoading)}
            className="w-full rounded-lg bg-blue-600 text-white p-4 font-semibold hover:bg-blue-700 transition-colors shadow-lg"
          >
            {assets.length > 0 ? 'Add Assets from Selected Wallet' : 'Load Assets from Selected Wallet →'}
          </button>
          {connectedEVMAddresses.filter(addr => isVerified(addr)).length > 1 && (
            <button
              onClick={handleLoadAllWallets}
              className="w-full rounded-lg bg-green-600 text-white p-4 font-semibold hover:bg-green-700 transition-colors shadow-lg"
            >
              Load Assets from ALL Verified Wallets ({connectedEVMAddresses.filter(addr => isVerified(addr)).length}) →
            </button>
          )}
          {assets.length > 0 && (
            <button
              onClick={() => onStepChange('assets')}
              className="w-full rounded-lg border-2 border-gray-300 bg-white p-4 font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Continue with Current Assets ({assets.length}) →
            </button>
          )}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              💡 You can connect multiple wallets. Load assets from each wallet individually, or load from all verified wallets at once.
            </p>
          </div>
        </div>
      )}

      {/* Loading Progress */}
      {loading && loadingProgress.total > 0 && (
        <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <LoadingSpinner size="sm" text={`Loading assets... (${loadingProgress.current}/${loadingProgress.total})`} />
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={showClearQueueDialog}
        title="Clear All Queued Wallets"
        message="Are you sure you want to clear all queued wallets? This cannot be undone."
        confirmText="Clear All"
        onConfirm={handleClearQueue}
        onCancel={() => setShowClearQueueDialog(false)}
        variant="danger"
      />

      <ConfirmationDialog
        isOpen={showClearAssetsDialog}
        title="Clear All Assets"
        message="Are you sure you want to clear all loaded assets and allocations? This cannot be undone."
        confirmText="Clear Assets"
        onConfirm={handleClearAssets}
        onCancel={() => setShowClearAssetsDialog(false)}
        variant="warning"
      />

      <ConfirmationDialog
        isOpen={showDisconnectAllDialog}
        title="Disconnect All Wallets"
        message="Are you sure you want to disconnect all wallets and clear all data? This will remove all loaded assets and allocations."
        confirmText="Disconnect All"
        onConfirm={handleDisconnectAll}
        onCancel={() => setShowDisconnectAllDialog(false)}
        variant="danger"
      />
    </div>
  )
}

