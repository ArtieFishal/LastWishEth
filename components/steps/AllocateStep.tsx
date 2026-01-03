'use client'

import { BeneficiaryForm } from '@/components/BeneficiaryForm'
import { AllocationPanel } from '@/components/AllocationPanel'
import { Asset, Beneficiary, Allocation, QueuedWalletSession, Step } from '@/types'

interface AllocateStepProps {
  assets: Asset[]
  selectedAssetIds: string[]
  beneficiaries: Beneficiary[]
  onBeneficiariesChange: (beneficiaries: Beneficiary[]) => void
  allocations: Allocation[]
  onAllocationsChange: (allocations: Allocation[]) => void
  queuedSessions: QueuedWalletSession[]
  onSaveToQueue: () => void
  onStepChange: (step: Step) => void
}

export function AllocateStep({
  assets,
  selectedAssetIds,
  beneficiaries,
  onBeneficiariesChange,
  allocations,
  onAllocationsChange,
  queuedSessions,
  onSaveToQueue,
  onStepChange,
}: AllocateStepProps) {
  const selectedAssets = assets.filter(a => selectedAssetIds.includes(a.id))
  const sessionAllocations = allocations.filter(a => selectedAssetIds.includes(a.assetId))

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Allocate Your Assets</h2>
      <p className="text-gray-600 mb-6">
        Assign your assets to beneficiaries. You can allocate by percentage or specific amounts.
      </p>

      {selectedAssetIds.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Assets Selected</h3>
            <p className="text-gray-600 mb-6">
              Go back to the Assets step to select which assets you want to allocate to beneficiaries.
            </p>
            <button
              onClick={() => onStepChange('assets')}
              className="inline-flex items-center px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-lg"
            >
              ← Go to Assets
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Beneficiaries Section */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Beneficiaries ({beneficiaries.length})</h3>
            
            <div className="mb-4">
              <BeneficiaryForm
                beneficiaries={beneficiaries}
                onBeneficiariesChange={onBeneficiariesChange}
              />
            </div>
            
            {beneficiaries.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {beneficiaries.map((ben) => {
                  const beneficiaryAllocations = allocations.filter(a => a.beneficiaryId === ben.id)
                  return (
                    <div key={ben.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900">{ben.name}</span>
                        <button
                          onClick={() => onBeneficiariesChange(beneficiaries.filter(b => b.id !== ben.id))}
                          className="text-red-600 hover:text-red-700 text-xs font-semibold"
                          aria-label={`Remove ${ben.name}`}
                        >
                          ×
                        </button>
                      </div>
                      {ben.ensName && ben.ensName !== ben.walletAddress && (
                        <p className="text-xs text-blue-700 font-semibold mb-1">{ben.ensName}</p>
                      )}
                      {ben.walletAddress && (
                        <p className="text-xs font-mono text-gray-600 break-all leading-tight mb-1">
                          {ben.walletAddress}
                        </p>
                      )}
                      {ben.phone && (
                        <p className="text-xs text-gray-600 mb-1">📞 {ben.phone}</p>
                      )}
                      {ben.email && (
                        <p className="text-xs text-gray-600 mb-1">✉️ {ben.email}</p>
                      )}
                      {ben.notes && (
                        <p className="text-xs text-gray-500 italic mb-1">💬 {ben.notes}</p>
                      )}
                      {beneficiaryAllocations.length > 0 && (
                        <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-blue-200">
                          {beneficiaryAllocations.length} allocation{beneficiaryAllocations.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">Add beneficiaries above to allocate assets</p>
              </div>
            )}
          </div>

          {/* Allocation Panel */}
          {beneficiaries.length > 0 ? (
            <AllocationPanel
              assets={selectedAssets}
              beneficiaries={beneficiaries}
              allocations={allocations}
              onAllocationChange={onAllocationsChange}
            />
          ) : (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 text-center">
              <p className="text-yellow-800 font-semibold">Add at least one beneficiary above to start allocating assets</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900 mb-1">
              Need to add more assets?
            </p>
            <p className="text-xs text-blue-700">
              Go back to connect another wallet and add more assets to your portfolio.
            </p>
          </div>
          <button
            onClick={() => onStepChange('connect')}
            className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            + Add Wallet
          </button>
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <button
          onClick={() => onStepChange('assets')}
          className="flex-1 rounded-lg border-2 border-gray-300 p-4 font-semibold hover:bg-gray-50 transition-colors"
        >
          ← Back to Assets
        </button>
        <button
          onClick={onSaveToQueue}
          disabled={selectedAssetIds.length === 0 || sessionAllocations.length === 0}
          className="flex-1 rounded-lg bg-green-600 text-white p-4 font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          ✓ Save to Queue ({queuedSessions.length}/20)
        </button>
        {queuedSessions.length > 0 && (
          <button
            onClick={() => onStepChange('details')}
            className="flex-1 rounded-lg bg-blue-600 text-white p-4 font-semibold hover:bg-blue-700 transition-colors shadow-lg"
          >
            Continue to Details ({queuedSessions.length} wallet{queuedSessions.length !== 1 ? 's' : ''}) →
          </button>
        )}
      </div>
    </div>
  )
}

