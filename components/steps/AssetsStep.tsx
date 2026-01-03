'use client'

import { AssetSelector } from '@/components/AssetSelector'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Asset, Step } from '@/types'

interface AssetsStepProps {
  assets: Asset[]
  selectedAssetIds: string[]
  onSelectionChange: (ids: string[]) => void
  loading: boolean
  selectedWalletForLoading: string | null
  btcAddress: string | null
  resolvedEnsNames: Record<string, string>
  walletNames: Record<string, string>
  walletProviders: Record<string, string>
  onStepChange: (step: Step) => void
}

export function AssetsStep({
  assets,
  selectedAssetIds,
  onSelectionChange,
  loading,
  selectedWalletForLoading,
  btcAddress,
  resolvedEnsNames,
  walletNames,
  walletProviders,
  onStepChange,
}: AssetsStepProps) {
  // Filter assets based on selected wallet
  const getFilteredAssets = () => {
    let filtered = assets
    if (selectedWalletForLoading) {
      filtered = assets.filter(a => a.walletAddress?.toLowerCase() === selectedWalletForLoading.toLowerCase())
    } else if (btcAddress) {
      filtered = assets.filter(a => a.chain === 'bitcoin' && (a.walletAddress === btcAddress || a.contractAddress === btcAddress))
    }
    return filtered
  }

  const filteredAssets = getFilteredAssets()

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Assets</h2>
      <p className="text-gray-600 mb-8">
        {selectedWalletForLoading || btcAddress
          ? 'Assets from the currently selected wallet'
          : 'Review all assets across your connected wallets'}
      </p>

      {loading ? (
        <div className="text-center py-12">
          <LoadingSpinner size="lg" text="Loading assets, be patient..." />
          <p className="mt-2 text-sm text-gray-500">This may take a few seconds as we fetch data from the blockchain</p>
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Assets Loaded Yet</h3>
            <p className="text-gray-600 mb-6">
              Connect your wallets and load assets to get started. You can connect multiple wallets and load assets from each one.
            </p>
            <button
              onClick={() => onStepChange('connect')}
              className="inline-flex items-center px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-lg"
            >
              ← Go to Connect Wallets
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Show which wallet's assets are being displayed */}
          {(selectedWalletForLoading || btcAddress) && (
            <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Currently Viewing Assets From:
              </p>
              {selectedWalletForLoading && (
                <p className="text-xs text-blue-700 font-mono break-all">
                  {resolvedEnsNames[selectedWalletForLoading.toLowerCase()] || walletNames[selectedWalletForLoading] || selectedWalletForLoading}
                  {walletProviders[selectedWalletForLoading] && (
                    <span className="ml-2 text-blue-600">({walletProviders[selectedWalletForLoading]})</span>
                  )}
                </p>
              )}
              {btcAddress && (
                <p className="text-xs text-blue-700 font-mono break-all">
                  {btcAddress} (Bitcoin Wallet)
                </p>
              )}
            </div>
          )}

          <AssetSelector
            assets={filteredAssets}
            selectedAssetIds={selectedAssetIds}
            onSelectionChange={onSelectionChange}
          />

          <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  Want to add assets from another wallet?
                </p>
                <p className="text-xs text-blue-700">
                  You can connect multiple wallets and add assets incrementally. Your current selections will be preserved.
                </p>
              </div>
              <button
                onClick={() => onStepChange('connect')}
                className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                + Add More Wallets
              </button>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={() => onStepChange('connect')}
              className="flex-1 rounded-lg border-2 border-blue-300 bg-blue-50 text-blue-700 p-4 font-semibold hover:bg-blue-100 transition-colors"
            >
              ← Add More Wallets
            </button>
            <button
              onClick={() => onStepChange('allocate')}
              disabled={selectedAssetIds.length === 0}
              className="flex-1 rounded-lg bg-blue-600 text-white p-4 font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
            >
              Continue to Allocation ({selectedAssetIds.length} selected) →
            </button>
          </div>
        </>
      )}
    </div>
  )
}

