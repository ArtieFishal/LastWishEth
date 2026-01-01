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

  // Quick allocate: distribute all assets evenly across all beneficiaries
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

    // Allocate each asset evenly across all beneficiaries
    for (const asset of assets) {
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

    if (newAllocations.length > 0) {
      onAllocationChange([...allocations, ...newAllocations])
      alert(`Allocated ${assets.length} asset${assets.length !== 1 ? 's' : ''} evenly across ${beneficiaries.length} beneficiary${beneficiaries.length !== 1 ? 'ies' : ''} (${percentagePerBeneficiary.toFixed(2)}% each)`)
    } else {
      alert('All assets are already allocated')
    }
  }

  const handleAddAllocation = () => {
    if (selectedAssets.length === 0 || !selectedBeneficiary) {
      alert('Please select at least one asset and a beneficiary')
      return
    }

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

    const newAllocations: Allocation[] = []

    // Create allocation for each selected asset
    for (const assetId of selectedAssets) {
      const asset = assets.find((a) => a.id === assetId)
      if (!asset) continue

      if (allocationType === 'percentage' && value > 100) {
        alert('Percentage cannot exceed 100%')
        return
      }

      const assetBalance = parseFloat(asset.balance) / Math.pow(10, asset.decimals || 18)
      if (allocationType === 'amount' && value > assetBalance) {
        alert(`Amount cannot exceed available balance for ${asset.symbol}: ${assetBalance.toFixed(6)}`)
        return
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
            {assets.map((asset) => {
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
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
            <select
              value={allocationType}
              onChange={(e) => handleAllocationTypeChange(e.target.value as 'amount' | 'percentage')}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="percentage">%</option>
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
                Distribute all {assets.length} asset{assets.length !== 1 ? 's' : ''} evenly across {beneficiaries.length} beneficiary{beneficiaries.length !== 1 ? 'ies' : ''} ({defaultPercentage.toFixed(2)}% each)
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
          {allocationSummary.map(({ asset, allocations: assetAllocs, totalPercentage, totalAmount, isOverAllocated, isUnallocated, hasPercentageAllocations, hasAmountAllocations, assetBalance }) => (
            <div
              key={asset.id}
              className={`rounded-lg border-2 p-3 ${
                isOverAllocated 
                  ? 'border-red-300 bg-red-50' 
                  : isUnallocated 
                  ? 'border-yellow-300 bg-yellow-50' 
                  : 'border-green-200 bg-green-50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-sm text-gray-900">{asset.symbol}</span>
                    <span className="text-xs text-gray-600">
                      Balance: {asset.balanceFormatted}
                    </span>
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
                  {isOverAllocated && (
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
                    return (
                      <div
                        key={`${alloc.assetId}-${alloc.beneficiaryId}`}
                        className="flex items-center justify-between text-xs bg-white rounded p-2"
                      >
                        <span className="text-gray-700">
                          <span className="font-semibold">{beneficiary?.name}:</span>{' '}
                          {alloc.type === 'percentage'
                            ? `${alloc.percentage}%`
                            : `${alloc.amount} ${asset.symbol}`}
                        </span>
                        <button
                          onClick={() => handleRemoveAllocation(alloc.assetId, alloc.beneficiaryId)}
                          className="text-red-600 hover:text-red-700 font-semibold px-2 py-0.5 rounded hover:bg-red-50 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                  <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-300">
                    {hasPercentageAllocations && (
                      <div>Total %: <span className="font-semibold">{totalPercentage.toFixed(2)}%</span></div>
                    )}
                    {hasAmountAllocations && (
                      <div>Total Amount: <span className="font-semibold">{totalAmount.toFixed(6)} {asset.symbol}</span></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
