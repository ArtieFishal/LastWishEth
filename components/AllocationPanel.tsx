'use client'

import { useState } from 'react'
import { Asset, Beneficiary, Allocation } from '@/types'

interface AllocationPanelProps {
  assets: Asset[]
  beneficiaries: Beneficiary[]
  allocations: Allocation[]
  onAllocationChange: (allocations: Allocation[]) => void
}

export function AllocationPanel({
  assets,
  beneficiaries,
  allocations,
  onAllocationChange,
}: AllocationPanelProps) {
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string | null>(null)
  const [allocationType, setAllocationType] = useState<'amount' | 'percentage'>('percentage')
  const [allocationValue, setAllocationValue] = useState('')
  const [editingAllocation, setEditingAllocation] = useState<{ assetId: string; beneficiaryId: string } | null>(null)

  // Helper to check if asset is NFT (non-fungible)
  const isNFT = (asset: Asset) => asset.type === 'erc721' || asset.type === 'erc1155'
  
  // Helper to check if asset is fungible (can be split)
  const isFungible = (asset: Asset) => asset.type === 'native' || asset.type === 'erc20' || asset.type === 'btc'
  
  // Separate assets into NFTs and fungible tokens
  const nftAssets = assets.filter(isNFT)
  const fungibleAssets = assets.filter(isFungible)

  // Calculate default percentage based on number of beneficiaries
  // 1 beneficiary = 100%, 2 = 50% each, 3 = 33.33% each, etc.
  const defaultPercentage = beneficiaries.length > 0 
    ? Math.round((100 / beneficiaries.length) * 100) / 100 // Round to 2 decimals
    : 0

  // Auto-fill default percentage when beneficiary is selected and type is percentage
  const handleBeneficiaryChange = (beneficiaryId: string) => {
    setSelectedBeneficiary(beneficiaryId)
    if (allocationType === 'percentage' && beneficiaries.length > 0 && !allocationValue) {
      setAllocationValue(defaultPercentage.toFixed(2))
    }
  }

  // Auto-fill default percentage when allocation type changes to percentage
  const handleAllocationTypeChange = (type: 'amount' | 'percentage') => {
    setAllocationType(type)
    if (type === 'percentage' && beneficiaries.length > 0 && !allocationValue) {
      setAllocationValue(defaultPercentage.toFixed(2))
    } else if (type === 'amount') {
      setAllocationValue('')
    }
  }

  const toggleAsset = (assetId: string) => {
    if (selectedAssets.includes(assetId)) {
      setSelectedAssets(selectedAssets.filter(id => id !== assetId))
    } else {
      setSelectedAssets([...selectedAssets, assetId])
    }
  }

  const selectAllAssets = () => {
    setSelectedAssets(assets.map(a => a.id))
  }

  const deselectAllAssets = () => {
    setSelectedAssets([])
  }

  // Quick allocate: distribute fungible tokens evenly, assign NFTs to first beneficiary
  const handleQuickAllocate = () => {
    if (beneficiaries.length === 0) {
      alert('Please add at least one beneficiary first')
      return
    }
    if (assets.length === 0) {
      alert('No assets to allocate')
      return
    }

    const percentagePerBeneficiary = defaultPercentage
    const newAllocations: Allocation[] = []

    // Allocate fungible tokens evenly across all beneficiaries
    for (const asset of fungibleAssets) {
      for (const beneficiary of beneficiaries) {
        // Check if allocation already exists
        const exists = allocations.some(
          a => a.assetId === asset.id && a.beneficiaryId === beneficiary.id
        )
        
        if (!exists) {
          newAllocations.push({
            assetId: asset.id,
            beneficiaryId: beneficiary.id,
            type: 'percentage',
            percentage: percentagePerBeneficiary,
          })
        }
      }
    }

    // Allocate NFTs to first beneficiary only (100% - can't split NFTs)
    for (const asset of nftAssets) {
      const firstBeneficiary = beneficiaries[0]
      // Check if allocation already exists
      const exists = allocations.some(
        a => a.assetId === asset.id && a.beneficiaryId === firstBeneficiary.id
      )
      
      if (!exists) {
        newAllocations.push({
          assetId: asset.id,
          beneficiaryId: firstBeneficiary.id,
          type: 'percentage',
          percentage: 100, // NFTs go 100% to one beneficiary
        })
      }
    }

    if (newAllocations.length > 0) {
      const fungibleCount = fungibleAssets.length
      const nftCount = nftAssets.length
      let message = ''
      if (fungibleCount > 0) {
        message += `Allocated ${fungibleCount} fungible token${fungibleCount !== 1 ? 's' : ''} evenly across ${beneficiaries.length} beneficiary${beneficiaries.length !== 1 ? 'ies' : ''} (${percentagePerBeneficiary.toFixed(2)}% each). `
      }
      if (nftCount > 0) {
        message += `Allocated ${nftCount} NFT${nftCount !== 1 ? 's' : ''} to ${beneficiaries[0].name} (NFTs cannot be split).`
      }
      onAllocationChange([...allocations, ...newAllocations])
      alert(message.trim())
    } else {
      alert('All assets are already allocated')
    }
  }

  const handleAddAllocation = () => {
    if (selectedAssets.length === 0 || !selectedBeneficiary) {
      alert('Please select at least one asset and a beneficiary')
      return
    }

    const newAllocations: Allocation[] = []

    // Create allocation for each selected asset
    for (const assetId of selectedAssets) {
      const asset = assets.find((a) => a.id === assetId)
      if (!asset) continue

      const assetIsNFT = isNFT(asset)

      // For NFTs: must be 100% to one beneficiary, can't split
      if (assetIsNFT) {
        // Check if this NFT is already allocated to someone else
        const existingNFTAllocation = allocations.find(a => a.assetId === assetId)
        if (existingNFTAllocation && existingNFTAllocation.beneficiaryId !== selectedBeneficiary) {
          const existingBeneficiary = beneficiaries.find(b => b.id === existingNFTAllocation.beneficiaryId)
          alert(`NFT "${asset.name || asset.symbol}" is already allocated to ${existingBeneficiary?.name || 'another beneficiary'}. NFTs cannot be split - remove the existing allocation first.`)
          return
        }

        // NFTs always get 100% allocation to one beneficiary
        const newAllocation: Allocation = {
          assetId,
          beneficiaryId: selectedBeneficiary,
          type: 'percentage',
          percentage: 100,
        }

        // Check for existing allocation for this asset+beneficiary combo
        const existingIndex = allocations.findIndex(
          (a) => a.assetId === assetId && a.beneficiaryId === selectedBeneficiary
        )

        if (existingIndex >= 0) {
          // Update existing allocation
          const updated = [...allocations]
          updated[existingIndex] = newAllocation
          onAllocationChange(updated)
        } else {
          newAllocations.push(newAllocation)
        }
      } else {
        // For fungible tokens: use percentage or amount
        // Use default percentage if not provided and type is percentage
        let value = parseFloat(allocationValue)
        if (isNaN(value) || value <= 0) {
          if (allocationType === 'percentage' && beneficiaries.length > 0) {
            value = defaultPercentage
          } else {
            alert('Please enter a valid positive number')
            return
          }
        }

        if (allocationType === 'percentage' && value > 100) {
          alert('Percentage cannot exceed 100%')
          return
        }

        // For fungible tokens, we don't check against balance when using percentage
        // Percentage is just what % of the token goes to this beneficiary
        if (allocationType === 'amount') {
          const assetBalance = parseFloat(asset.balance) / Math.pow(10, asset.decimals || 18)
          if (value > assetBalance) {
            alert(`Amount cannot exceed available balance for ${asset.symbol}: ${assetBalance.toFixed(6)}`)
            return
          }
        }

        const newAllocation: Allocation = {
          assetId,
          beneficiaryId: selectedBeneficiary,
          type: allocationType,
          ...(allocationType === 'amount'
            ? { amount: allocationValue }
            : { percentage: value }),
        }

        // Check for existing allocation for this asset+beneficiary combo
        const existingIndex = allocations.findIndex(
          (a) => a.assetId === assetId && a.beneficiaryId === selectedBeneficiary
        )

        if (existingIndex >= 0) {
          // Update existing allocation
          const updated = [...allocations]
          updated[existingIndex] = newAllocation
          onAllocationChange(updated)
        } else {
          newAllocations.push(newAllocation)
        }
      }
    }

    // Add new allocations
    if (newAllocations.length > 0) {
      onAllocationChange([...allocations, ...newAllocations])
    }

    // Reset form but keep allocation type and default value
    setSelectedAssets([])
    setSelectedBeneficiary(null)
    // Reset to default percentage if type is percentage, otherwise clear
    if (allocationType === 'percentage' && beneficiaries.length > 0) {
      setAllocationValue(defaultPercentage.toFixed(2))
    } else {
      setAllocationValue('')
    }
  }

  const handleRemoveAllocation = (assetId: string, beneficiaryId: string) => {
    onAllocationChange(
      allocations.filter(
        (a) => !(a.assetId === assetId && a.beneficiaryId === beneficiaryId)
      )
    )
  }

  const handleChangeBeneficiary = (assetId: string, oldBeneficiaryId: string, newBeneficiaryId: string) => {
    if (!newBeneficiaryId || newBeneficiaryId === oldBeneficiaryId) {
      return
    }

    const asset = assets.find(a => a.id === assetId)
    if (!asset) return

    const assetIsNFT = isNFT(asset)
    
    // For NFTs, check if already allocated to the new beneficiary
    if (assetIsNFT) {
      const existingAllocation = allocations.find(
        a => a.assetId === assetId && a.beneficiaryId === newBeneficiaryId
      )
      if (existingAllocation) {
        alert(`This NFT is already allocated to ${beneficiaries.find(b => b.id === newBeneficiaryId)?.name || 'another beneficiary'}.`)
        return
      }
    }

    // Update the allocation with new beneficiary
    const updatedAllocations = allocations.map(alloc => {
      if (alloc.assetId === assetId && alloc.beneficiaryId === oldBeneficiaryId) {
        return {
          ...alloc,
          beneficiaryId: newBeneficiaryId
        }
      }
      return alloc
    })

    onAllocationChange(updatedAllocations)
  }

  // Calculate allocation summary
  const allocationSummary = assets.map((asset) => {
    const assetAllocations = allocations.filter((a) => a.assetId === asset.id)
    const percentageAllocations = assetAllocations.filter((a) => a.type === 'percentage')
    const amountAllocations = assetAllocations.filter((a) => a.type === 'amount')
    
    const totalPercentage = percentageAllocations.reduce(
      (sum, a) => sum + (a.percentage || 0),
      0
    )
    const totalAmount = amountAllocations.reduce(
      (sum, a) => sum + parseFloat(a.amount || '0'),
      0
    )

    const assetBalance = parseFloat(asset.balance) / Math.pow(10, asset.decimals || 18)
    const isOverAllocated = totalPercentage > 100 || totalAmount > assetBalance

    return {
      asset,
      allocations: assetAllocations,
      totalPercentage,
      totalAmount,
      isOverAllocated,
      isUnallocated: assetAllocations.length === 0,
      hasPercentageAllocations: percentageAllocations.length > 0,
      hasAmountAllocations: amountAllocations.length > 0,
      assetBalance,
    }
  })

  return (
    <div className="space-y-4">
      {/* Add Allocation Form */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4 space-y-3">
        <h4 className="font-semibold text-gray-900 text-sm">Add Allocation</h4>
        
        {/* Multi-select Assets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-gray-700">Assets ({selectedAssets.length} selected)</label>
            <div className="flex gap-2">
              <button
                onClick={selectAllAssets}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={deselectAllAssets}
                className="text-xs text-gray-600 hover:text-gray-700 font-semibold"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1 bg-gray-50">
            {fungibleAssets.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-700 mb-1">💰 Fungible Tokens (Can Split)</p>
                {fungibleAssets.map((asset) => {
                  const isSelected = selectedAssets.includes(asset.id)
                  return (
                    <label
                      key={asset.id}
                      className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAsset(asset.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{asset.symbol}</span>
                          <span className="text-xs text-gray-500">({asset.balanceFormatted})</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                            {asset.chain.toUpperCase()}
                          </span>
                        </div>
                        {asset.walletAddress && (
                          <p className="text-xs text-gray-500 font-mono mt-1 break-all">
                            Wallet: {asset.walletAddress.slice(0, 6)}...{asset.walletAddress.slice(-4)}
                          </p>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
            {nftAssets.length > 0 && (
              <div className={fungibleAssets.length > 0 ? 'mt-3 pt-3 border-t border-gray-300' : ''}>
                <p className="text-xs font-semibold text-gray-700 mb-1">🖼️ NFTs (Cannot Split - One Beneficiary Only)</p>
                {nftAssets.map((asset) => {
                  const isSelected = selectedAssets.includes(asset.id)
                  const existingAllocation = allocations.find(a => a.assetId === asset.id)
                  const allocatedTo = existingAllocation ? beneficiaries.find(b => b.id === existingAllocation.beneficiaryId) : null
                  return (
                    <label
                      key={asset.id}
                      className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                        isSelected ? 'bg-pink-50 border border-pink-200' : existingAllocation ? 'bg-yellow-50 border border-yellow-200' : 'hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAsset(asset.id)}
                        className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500 mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{asset.name || asset.symbol}</span>
                          {asset.tokenId && (
                            <span className="text-xs text-gray-500">Token #{asset.tokenId}</span>
                          )}
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-pink-100 text-pink-800">
                            NFT
                          </span>
                          {existingAllocation && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800">
                              → {allocatedTo?.name || 'Allocated'}
                            </span>
                          )}
                        </div>
                        {asset.walletAddress && (
                          <p className="text-xs text-gray-500 font-mono mt-1 break-all">
                            Wallet: {asset.walletAddress.slice(0, 6)}...{asset.walletAddress.slice(-4)}
                          </p>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Beneficiary</label>
          <select
            value={selectedBeneficiary || ''}
            onChange={(e) => handleBeneficiaryChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select beneficiary</option>
            {beneficiaries.map((ben) => (
              <option key={ben.id} value={ben.id}>
                {ben.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Show allocation controls only for fungible tokens */}
        {selectedAssets.some(id => {
          const asset = assets.find(a => a.id === id)
          return asset && isFungible(asset)
        }) && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
              <select
                value={allocationType}
                onChange={(e) => handleAllocationTypeChange(e.target.value as 'amount' | 'percentage')}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="percentage">% (Percentage)</option>
                <option value="amount">Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {allocationType === 'percentage' ? 'Percentage (%)' : 'Amount'}
                {allocationType === 'percentage' && beneficiaries.length > 0 && (
                  <span className="text-gray-500 font-normal ml-1">
                    (default: {defaultPercentage.toFixed(2)}%)
                  </span>
                )}
              </label>
              <input
                type="number"
                value={allocationValue}
                onChange={(e) => setAllocationValue(e.target.value)}
                placeholder={allocationType === 'percentage' && beneficiaries.length > 0 ? defaultPercentage.toFixed(2) : ''}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                step={allocationType === 'percentage' ? '0.01' : '0.00000001'}
                min="0"
                max={allocationType === 'percentage' ? '100' : undefined}
              />
            </div>
          </div>
        )}
        
        {/* Show NFT warning if NFTs are selected */}
        {selectedAssets.some(id => {
          const asset = assets.find(a => a.id === id)
          return asset && isNFT(asset)
        }) && (
          <div className="bg-pink-50 border-2 border-pink-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-pink-900 mb-1">⚠️ NFT Selected</p>
            <p className="text-xs text-pink-800">
              NFTs cannot be split. This NFT will be allocated 100% to the selected beneficiary. If already allocated, it will be reassigned.
            </p>
          </div>
        )}
        
        <button
          onClick={handleAddAllocation}
          disabled={selectedAssets.length === 0 || !selectedBeneficiary}
          className="w-full rounded-lg bg-blue-600 text-white p-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add Allocation{selectedAssets.length > 1 ? `s (${selectedAssets.length})` : ''}
          {allocationType === 'percentage' && !allocationValue && beneficiaries.length > 0 && ` (${defaultPercentage.toFixed(2)}% each)`}
        </button>
      </div>

      {/* Quick Allocate Button */}
      {beneficiaries.length > 0 && assets.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-900">Quick Allocate</p>
              <p className="text-xs text-blue-700">
                {fungibleAssets.length > 0 && (
                  <>Distribute {fungibleAssets.length} fungible token{fungibleAssets.length !== 1 ? 's' : ''} evenly ({defaultPercentage.toFixed(2)}% each). </>
                )}
                {nftAssets.length > 0 && (
                  <>Assign {nftAssets.length} NFT{nftAssets.length !== 1 ? 's' : ''} to {beneficiaries[0]?.name || 'first beneficiary'} (NFTs cannot be split).</>
                )}
              </p>
            </div>
            <button
              onClick={handleQuickAllocate}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Quick Allocate
            </button>
          </div>
        </div>
      )}

      {/* Allocation Summary */}
      <div className="space-y-2">
        <h4 className="font-semibold text-gray-900 text-sm">Allocation Summary</h4>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {allocationSummary.map(({ asset, allocations: assetAllocs, totalPercentage, totalAmount, isOverAllocated, isUnallocated, hasPercentageAllocations, hasAmountAllocations, assetBalance }) => {
            const assetIsNFT = isNFT(asset)
            return (
              <div
                key={asset.id}
                className={`rounded-lg border-2 p-3 ${
                  assetIsNFT
                    ? 'border-pink-300 bg-pink-50'
                    : isOverAllocated 
                    ? 'border-red-300 bg-red-50' 
                    : isUnallocated 
                    ? 'border-yellow-300 bg-yellow-50' 
                    : 'border-green-200 bg-green-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-sm text-gray-900">{asset.name || asset.symbol}</span>
                      {assetIsNFT ? (
                        <>
                          {asset.tokenId && (
                            <span className="text-xs text-gray-600">Token #{asset.tokenId}</span>
                          )}
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-pink-100 text-pink-800">
                            NFT (Cannot Split)
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-gray-600">
                            Balance: {asset.balanceFormatted}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                            Fungible Token
                          </span>
                        </>
                      )}
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                        {asset.chain.toUpperCase()}
                      </span>
                    </div>
                    {asset.walletAddress && (
                      <p className="text-xs text-gray-500 font-mono break-all">
                        Wallet: {asset.walletAddress}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-2">
                    {assetIsNFT && assetAllocs.length > 0 && (
                      <span className="text-xs text-pink-700 font-semibold bg-pink-100 px-2 py-0.5 rounded">100% Allocated</span>
                    )}
                    {!assetIsNFT && isOverAllocated && (
                      <span className="text-xs text-red-700 font-semibold bg-red-100 px-2 py-0.5 rounded">⚠️ Over</span>
                    )}
                    {isUnallocated && (
                      <span className="text-xs text-yellow-700 font-semibold bg-yellow-100 px-2 py-0.5 rounded">⚠️ Unallocated</span>
                    )}
                  </div>
                </div>
                {assetAllocs.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {assetAllocs.map((alloc) => {
                      const beneficiary = beneficiaries.find((b) => b.id === alloc.beneficiaryId)
                      const isEditing = editingAllocation?.assetId === alloc.assetId && editingAllocation?.beneficiaryId === alloc.beneficiaryId
                      return (
                        <div
                          key={`${alloc.assetId}-${alloc.beneficiaryId}`}
                          className="flex items-center justify-between text-xs bg-white rounded p-2"
                        >
                          {isEditing ? (
                            <div className="flex-1 flex items-center gap-2">
                              <select
                                value={alloc.beneficiaryId}
                                onChange={(e) => {
                                  handleChangeBeneficiary(alloc.assetId, alloc.beneficiaryId, e.target.value)
                                  setEditingAllocation(null)
                                }}
                                className="flex-1 rounded border border-gray-300 p-1 text-xs focus:border-blue-500 focus:outline-none"
                                autoFocus
                              >
                                {beneficiaries.map((ben) => (
                                  <option key={ben.id} value={ben.id}>
                                    {ben.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => setEditingAllocation(null)}
                                className="text-gray-600 hover:text-gray-700 px-2 py-0.5 rounded hover:bg-gray-50 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="text-gray-700 flex-1">
                                <span className="font-semibold">{beneficiary?.name}:</span>{' '}
                                {assetIsNFT ? (
                                  <span className="text-pink-700 font-bold">100% (Entire NFT)</span>
                                ) : alloc.type === 'percentage' ? (
                                  `${alloc.percentage}% of ${asset.symbol}`
                                ) : (
                                  `${alloc.amount} ${asset.symbol}`
                                )}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setEditingAllocation({ assetId: alloc.assetId, beneficiaryId: alloc.beneficiaryId })}
                                  className="text-blue-600 hover:text-blue-700 font-semibold px-2 py-0.5 rounded hover:bg-blue-50 transition-colors"
                                  title="Change beneficiary"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleRemoveAllocation(alloc.assetId, alloc.beneficiaryId)}
                                  className="text-red-600 hover:text-red-700 font-semibold px-2 py-0.5 rounded hover:bg-red-50 transition-colors"
                                  title="Remove allocation"
                                >
                                  ×
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                    {!assetIsNFT && (
                      <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-300">
                        {hasPercentageAllocations && (
                          <div>Total %: <span className="font-semibold">{totalPercentage.toFixed(2)}%</span> of {asset.symbol}</div>
                        )}
                        {hasAmountAllocations && (
                          <div>Total Amount: <span className="font-semibold">{totalAmount.toFixed(6)} {asset.symbol}</span></div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
