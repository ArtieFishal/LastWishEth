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
  const [allocationHistory, setAllocationHistory] = useState<Allocation[][]>([]) // Track history for undo
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'chain' | 'type'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

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

  const selectAllFungible = () => {
    setSelectedAssets(fungibleAssets.map(a => a.id))
  }

  const selectAllNFTs = () => {
    setSelectedAssets(nftAssets.map(a => a.id))
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
      // Save current state to history before adding
      setAllocationHistory(prev => [...prev, [...allocations]])
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
      // Save current state to history before adding
      setAllocationHistory(prev => [...prev, [...allocations]])
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
    // Save current state to history before removing
    setAllocationHistory(prev => [...prev, [...allocations]])
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

    // Save current state to history before change
    setAllocationHistory(prev => [...prev, [...allocations]])

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

  const handleUnallocateLast = () => {
    if (allocationHistory.length === 0) {
      alert('Nothing to undo. No previous allocation state to restore.')
      return
    }
    const previousState = allocationHistory[allocationHistory.length - 1]
    setAllocationHistory(prev => prev.slice(0, -1)) // Remove last history entry
    onAllocationChange(previousState)
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
      assetIsNFT: isNFT(asset),
    }
  })

  return (
    <div className="space-y-4">
      {/* Add Allocation Form - Compact */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4 space-y-3">
        <h4 className="font-semibold text-gray-900 text-sm">Add Allocation</h4>
        
        {/* Multi-select Assets - Compact Grid */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-gray-700">Assets ({selectedAssets.length} selected)</label>
            <div className="flex gap-2">
              <button
                onClick={selectAllFungible}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                All Fungible
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={selectAllNFTs}
                className="text-xs text-pink-600 hover:text-pink-700 font-semibold"
              >
                All NFTs
              </button>
              <span className="text-gray-300">|</span>
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
          <div className="max-h-[600px] overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
            {fungibleAssets.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-700 mb-1">💰 Fungible Tokens (Can Split)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {fungibleAssets.map((asset) => {
                    const isSelected = selectedAssets.includes(asset.id)
                    const assetBalance = asset.balance ? parseFloat(asset.balance) / Math.pow(10, asset.decimals || 18) : 0
                    return (
                      <label
                        key={asset.id}
                        className={`flex items-start gap-3 p-2.5 rounded cursor-pointer transition-colors text-xs border ${
                          isSelected ? 'bg-blue-50 border-blue-300 shadow-sm' : 'hover:bg-gray-100 border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleAsset(asset.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-sm text-gray-900">{asset.symbol}</span>
                            <span className="text-gray-500 text-xs">({asset.chain})</span>
                            {asset.walletProvider && (
                              <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700">
                                {asset.walletProvider}
                              </span>
                            )}
                          </div>
                          {asset.name && asset.name !== asset.symbol && (
                            <p className="text-xs text-gray-600 mb-1">{asset.name}</p>
                          )}
                          {assetBalance > 0 && (
                            <p className="text-xs font-mono text-gray-700">
                              Balance: {assetBalance.toLocaleString()} {asset.symbol}
                            </p>
                          )}
                          {asset.contractAddress && (
                            <p className="text-xs font-mono text-gray-500 truncate mt-1">
                              {asset.contractAddress.slice(0, 10)}...{asset.contractAddress.slice(-8)}
                            </p>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
            {nftAssets.length > 0 && (
              <div className={fungibleAssets.length > 0 ? 'mt-2 pt-2 border-t border-gray-300' : ''}>
                <p className="text-xs font-semibold text-gray-700 mb-1">🖼️ NFTs (Cannot Split)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {nftAssets.map((asset) => {
                    const isSelected = selectedAssets.includes(asset.id)
                    const existingAllocation = allocations.find(a => a.assetId === asset.id)
                    const allocatedTo = existingAllocation ? beneficiaries.find(b => b.id === existingAllocation.beneficiaryId) : null
                    return (
                      <label
                        key={asset.id}
                        className={`flex items-start gap-3 p-2.5 rounded cursor-pointer transition-colors text-xs border ${
                          isSelected ? 'bg-pink-50 border-pink-300 shadow-sm' : existingAllocation ? 'bg-yellow-50 border-yellow-300' : 'hover:bg-gray-100 border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleAsset(asset.id)}
                          className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500 mt-0.5"
                        />
                        {asset.imageUrl && (
                          <img 
                            src={asset.imageUrl.startsWith('ipfs://') 
                              ? asset.imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/')
                              : asset.imageUrl.startsWith('ipfs/')
                              ? `https://ipfs.io/${asset.imageUrl}`
                              : asset.imageUrl
                            }
                            alt={asset.name || asset.symbol}
                            className="w-16 h-16 rounded object-cover border-2 border-gray-300 flex-shrink-0"
                            onError={(e) => e.currentTarget.style.display = 'none'}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-sm text-gray-900 truncate">{asset.name || asset.symbol}</span>
                            {asset.tokenId && <span className="text-gray-500 text-xs">#{asset.tokenId}</span>}
                            <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-pink-100 text-pink-700">NFT</span>
                          </div>
                          {asset.chain && (
                            <p className="text-xs text-gray-500 mb-1">Chain: {asset.chain}</p>
                          )}
                          {asset.contractAddress && (
                            <p className="text-xs font-mono text-gray-500 truncate mb-1">
                              Contract: {asset.contractAddress.slice(0, 10)}...{asset.contractAddress.slice(-8)}
                            </p>
                          )}
                          {existingAllocation && (
                            <p className="text-xs text-yellow-700 font-semibold mt-1">
                              → Allocated to: {allocatedTo?.name}
                            </p>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Beneficiary and Controls - Boxed Layout */}
        <div className="space-y-3">
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
          
          {/* Allocation controls only for fungible */}
          {selectedAssets.some(id => {
            const asset = assets.find(a => a.id === id)
            return asset && isFungible(asset)
          }) && (
            <>
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
                  {allocationType === 'amount' && selectedAssets.some(id => {
                    const asset = assets.find(a => a.id === id)
                    return asset?.type === 'btc'
                  }) && (
                    <span className="text-gray-500 font-normal ml-1">(in BTC or SATs)</span>
                  )}
                </label>
                <input
                  type="number"
                  value={allocationValue}
                  onChange={(e) => setAllocationValue(e.target.value)}
                  placeholder={allocationType === 'percentage' && beneficiaries.length > 0 ? defaultPercentage.toFixed(2) : 
                    selectedAssets.some(id => {
                      const asset = assets.find(a => a.id === id)
                      return asset?.type === 'btc'
                    }) ? '0.00000001 (1 SAT minimum)' : ''}
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                  step={allocationType === 'percentage' ? '0.01' : 
                    selectedAssets.some(id => {
                      const asset = assets.find(a => a.id === id)
                      return asset?.type === 'btc'
                    }) ? '0.00000001' : '0.00000001'}
                  min="0"
                  max={allocationType === 'percentage' ? '100' : undefined}
                />
                {allocationType === 'amount' && selectedAssets.some(id => {
                  const asset = assets.find(a => a.id === id)
                  return asset?.type === 'btc' && allocationValue
                }) && (() => {
                  const btcAmount = parseFloat(allocationValue)
                  if (!isNaN(btcAmount) && btcAmount > 0) {
                    const sats = Math.floor(btcAmount * 100000000)
                    return (
                      <p className="text-xs text-gray-500 mt-1">
                        = {sats.toLocaleString('en-US')} SATs
                      </p>
                    )
                  }
                  return null
                })()}
              </div>
            </>
          )}
        </div>
        
        {/* NFT warning */}
        {selectedAssets.some(id => {
          const asset = assets.find(a => a.id === id)
          return asset && isNFT(asset)
        }) && (
          <div className="bg-pink-50 border-2 border-pink-200 rounded-lg p-2">
            <p className="text-xs font-semibold text-pink-900">⚠️ NFT Selected - Will be allocated 100% to selected beneficiary</p>
          </div>
        )}
        
        <button
          onClick={handleAddAllocation}
          disabled={selectedAssets.length === 0 || !selectedBeneficiary}
          className="w-full rounded-lg bg-blue-600 text-white p-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add Allocation{selectedAssets.length > 1 ? `s (${selectedAssets.length})` : ''}
        </button>
      </div>

      {/* Quick Allocate and Undo */}
      <div className="flex gap-3">
        {beneficiaries.length > 0 && assets.length > 0 && (
          <button
            onClick={handleQuickAllocate}
            className="flex-1 rounded-lg bg-blue-600 text-white p-3 font-semibold hover:bg-blue-700 transition-colors"
          >
            Quick Allocate All
          </button>
        )}
        {allocationHistory.length > 0 && (
          <button
            onClick={handleUnallocateLast}
            className="px-4 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            ↶ Undo Last
          </button>
        )}
      </div>

      {/* Allocation Summary - Enhanced with Sorting */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-900 text-lg">Allocation Summary</h4>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'status' | 'chain' | 'type')}
              className="text-xs rounded border border-gray-300 px-2 py-1 focus:border-blue-500 focus:outline-none"
            >
              <option value="name">Name</option>
              <option value="status">Status</option>
              <option value="chain">Chain</option>
              <option value="type">Type</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
        
        {/* Sort the allocation summary */}
        {(() => {
          const sorted = [...allocationSummary].sort((a, b) => {
            let comparison = 0
            switch (sortBy) {
              case 'name':
                comparison = (a.asset.name || a.asset.symbol).localeCompare(b.asset.name || b.asset.symbol)
                break
              case 'status':
                const aStatus = a.isUnallocated ? 0 : a.isOverAllocated ? 2 : 1
                const bStatus = b.isUnallocated ? 0 : b.isOverAllocated ? 2 : 1
                comparison = aStatus - bStatus
                break
              case 'chain':
                comparison = (a.asset.chain || '').localeCompare(b.asset.chain || '')
                break
              case 'type':
                comparison = (a.assetIsNFT ? 'NFT' : 'Token').localeCompare(b.assetIsNFT ? 'NFT' : 'Token')
                break
            }
            return sortOrder === 'asc' ? comparison : -comparison
          })
          
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map(({ asset, allocations: assetAllocs, totalPercentage, totalAmount, isOverAllocated, isUnallocated, assetIsNFT, assetBalance }) => {
                return (
                  <div
                    key={asset.id}
                    className={`rounded-lg border-2 p-4 shadow-sm ${
                      assetIsNFT
                        ? 'border-pink-300 bg-pink-50'
                        : isOverAllocated 
                        ? 'border-red-300 bg-red-50' 
                        : isUnallocated 
                        ? 'border-yellow-300 bg-yellow-50' 
                        : 'border-green-200 bg-green-50'
                    }`}
                  >
                    {/* Enhanced header with more info */}
                    <div className="flex items-start gap-3 mb-3">
                      {assetIsNFT && asset.imageUrl && (
                        <img 
                          src={asset.imageUrl.startsWith('ipfs://') 
                            ? asset.imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/')
                            : asset.imageUrl.startsWith('ipfs/')
                            ? `https://ipfs.io/${asset.imageUrl}`
                            : asset.imageUrl
                          }
                          alt={asset.name || asset.symbol}
                          className="w-16 h-16 rounded object-cover border-2 border-pink-300 flex-shrink-0"
                          onError={(e) => e.currentTarget.style.display = 'none'}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-sm text-gray-900 truncate">{asset.name || asset.symbol}</span>
                          {assetIsNFT ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-pink-100 text-pink-800">
                              NFT
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                              {asset.symbol}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{asset.chain}</span>
                        </div>
                        {!assetIsNFT && assetBalance && (
                          <p className="text-xs text-gray-600 font-mono">
                            Total: {assetBalance.toLocaleString()} {asset.symbol}
                          </p>
                        )}
                        {asset.walletAddress && (
                          <p className="text-xs text-gray-500 font-mono truncate mt-1">
                            {asset.walletAddress}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Status badges - cleaner layout */}
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {assetIsNFT && assetAllocs.length > 0 && (
                        <span className="text-xs text-pink-700 font-semibold bg-pink-100 px-2 py-1 rounded">✓ Allocated</span>
                      )}
                      {!assetIsNFT && isOverAllocated && (
                        <span className="text-xs text-red-700 font-semibold bg-red-100 px-2 py-1 rounded">⚠️ Over-allocated</span>
                      )}
                      {isUnallocated && (
                        <span className="text-xs text-yellow-700 font-semibold bg-yellow-100 px-2 py-1 rounded">⚠️ Unallocated</span>
                      )}
                      {!assetIsNFT && !isUnallocated && !isOverAllocated && (
                        <span className="text-xs text-green-700 font-semibold bg-green-100 px-2 py-1 rounded">
                          {totalPercentage.toFixed(1)}% Allocated
                        </span>
                      )}
                    </div>
                    
                    {/* Allocations list - enhanced */}
                    {assetAllocs.length > 0 ? (
                      <div className="space-y-1.5 text-xs bg-white rounded p-2 border border-gray-200">
                        {assetAllocs.map((alloc) => {
                          const beneficiary = beneficiaries.find((b) => b.id === alloc.beneficiaryId)
                          let allocationDisplay = ''
                          if (assetIsNFT) {
                            allocationDisplay = '100%'
                          } else if (alloc.type === 'percentage') {
                            allocationDisplay = `${alloc.percentage}%`
                            if (asset.type === 'btc' && alloc.percentage) {
                              const satsAmount = Math.floor((parseFloat(asset.balance) * alloc.percentage) / 100)
                              allocationDisplay += ` (${satsAmount.toLocaleString('en-US')} SATs)`
                            }
                          } else {
                            allocationDisplay = `${alloc.amount} ${asset.symbol}`
                            if (asset.type === 'btc' && alloc.amount) {
                              const btcAmount = parseFloat(alloc.amount)
                              if (!isNaN(btcAmount)) {
                                const satsAmount = Math.floor(btcAmount * 100000000)
                                allocationDisplay += ` (${satsAmount.toLocaleString('en-US')} SATs)`
                              }
                            }
                          }
                          return (
                            <div key={`${alloc.assetId}-${alloc.beneficiaryId}`} className="flex items-center justify-between bg-gray-50 rounded p-1.5 border border-gray-200">
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold text-gray-900">{beneficiary?.name}</span>
                                <span className="text-gray-600 ml-1">: {allocationDisplay}</span>
                              </div>
                              <button
                                onClick={() => handleRemoveAllocation(alloc.assetId, alloc.beneficiaryId)}
                                className="text-red-600 hover:text-red-700 text-sm font-bold ml-2 px-1"
                                title="Remove allocation"
                              >
                                ×
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic text-center py-2">No allocations yet</p>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
