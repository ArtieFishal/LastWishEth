'use client'

import { useState, useMemo } from 'react'
import { Asset } from '@/types'

interface AssetSelectorProps {
  assets: Asset[]
  selectedAssetIds: string[]
  onSelectionChange: (selectedIds: string[]) => void
}

const getChainColor = (chain: string) => {
  const colors: Record<string, string> = {
    eth: 'bg-blue-100 text-blue-800',
    base: 'bg-indigo-100 text-indigo-800',
    arbitrum: 'bg-cyan-100 text-cyan-800',
    polygon: 'bg-purple-100 text-purple-800',
    bitcoin: 'bg-orange-100 text-orange-800',
  }
  return colors[chain.toLowerCase()] || 'bg-gray-100 text-gray-800'
}

const getAssetCategory = (asset: Asset): string => {
  if (asset.type === 'erc721' || asset.type === 'erc1155') {
    return 'NFTs'
  }
  if (asset.type === 'ethscription') {
    return 'Ethscriptions'
  }
  if (asset.type === 'native' || asset.type === 'btc' || asset.type === 'erc20') {
    return 'Currencies'
  }
  return 'Other'
}

// Helper to normalize wallet provider names for display
const getWalletProviderName = (provider?: string): string => {
  if (!provider || provider === 'Unknown') return 'Unknown'
  // Normalize common provider names
  const normalized = provider.toLowerCase()
  if (normalized.includes('metamask')) return 'MetaMask'
  if (normalized.includes('coinbase')) return 'Coinbase Wallet'
  if (normalized.includes('phantom')) return 'Phantom'
  if (normalized.includes('rainbow')) return 'Rainbow'
  if (normalized.includes('trust')) return 'Trust Wallet'
  if (normalized.includes('okx')) return 'OKX Wallet'
  if (normalized.includes('xverse')) return 'Xverse'
  if (normalized.includes('walletconnect')) return 'WalletConnect'
  // Return as-is if no match (capitalize first letter)
  return provider.charAt(0).toUpperCase() + provider.slice(1)
}

export function AssetSelector({ assets, selectedAssetIds, onSelectionChange }: AssetSelectorProps) {
  const [filter, setFilter] = useState<'all' | 'currencies' | 'nfts' | 'ethscriptions' | 'other'>('all')
  const [sortBy, setSortBy] = useState<'chain' | 'type' | 'value' | 'wallet'>('type')

  // Group and filter assets
  const groupedAssets = useMemo(() => {
    let filtered = assets

    // Debug: Log ethscriptions when filter is set
    if (filter === 'ethscriptions') {
      const ethscriptionAssets = assets.filter(a => a.type === 'ethscription')
      console.log(`[AssetSelector] Filter: ethscriptions, Found ${ethscriptionAssets.length} ethscription assets out of ${assets.length} total`)
      if (ethscriptionAssets.length > 0) {
        console.log('Sample ethscription asset:', ethscriptionAssets[0])
      }
    }

    // Filter by category
    if (filter !== 'all') {
      filtered = assets.filter(asset => {
        const category = getAssetCategory(asset)
        const matches = category.toLowerCase() === filter
        if (filter === 'ethscriptions' && asset.type === 'ethscription') {
          console.log(`[AssetSelector] Asset ${asset.name}: category="${category}", lowercased="${category.toLowerCase()}", filter="${filter}", matches=${matches}`)
        }
        return matches
      })
    }

    // Sort assets
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'chain') {
        return a.chain.localeCompare(b.chain)
      } else if (sortBy === 'type') {
        return getAssetCategory(a).localeCompare(getAssetCategory(b))
      } else if (sortBy === 'wallet') {
        // Sort by wallet provider (MetaMask, Coinbase, Phantom, etc.)
        // Normalize provider names for consistent sorting
        const aProvider = getWalletProviderName(a.walletProvider)
        const bProvider = getWalletProviderName(b.walletProvider)
        const providerCompare = aProvider.localeCompare(bProvider)
        if (providerCompare !== 0) return providerCompare
        // If same provider, sort by chain then type
        const chainCompare = a.chain.localeCompare(b.chain)
        if (chainCompare !== 0) return chainCompare
        return getAssetCategory(a).localeCompare(getAssetCategory(b))
      } else {
        const aValue = a.usdValue || 0
        const bValue = b.usdValue || 0
        return bValue - aValue
      }
    })

    // Group by category
    const groups: Record<string, Asset[]> = {}
    sorted.forEach(asset => {
      const category = getAssetCategory(asset)
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(asset)
    })

    return groups
  }, [assets, filter, sortBy])

  const toggleAsset = (assetId: string) => {
    if (selectedAssetIds.includes(assetId)) {
      onSelectionChange(selectedAssetIds.filter(id => id !== assetId))
    } else {
      onSelectionChange([...selectedAssetIds, assetId])
    }
  }

  const selectAll = () => {
    onSelectionChange(assets.map(a => a.id))
  }

  const deselectAll = () => {
    onSelectionChange([])
  }

  const selectCategory = (category: string) => {
    const categoryAssets = assets.filter(a => getAssetCategory(a) === category)
    const categoryIds = categoryAssets.map(a => a.id)
    const newSelection = [...new Set([...selectedAssetIds, ...categoryIds])]
    onSelectionChange(newSelection)
  }

  if (assets.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-500 font-medium">No assets found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-sm font-semibold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="px-3 py-1.5 text-sm font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Deselect All
          </button>
        </div>
        <div className="flex gap-2 ml-auto">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="currencies">Currencies</option>
            <option value="nfts">NFTs</option>
            <option value="ethscriptions">Ethscriptions</option>
            <option value="other">Other</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="type">Sort by Type</option>
            <option value="chain">Sort by Chain</option>
            <option value="wallet">Sort by Wallet</option>
            <option value="value">Sort by Value</option>
          </select>
        </div>
      </div>

      {/* Selected count */}
      <div className="text-sm text-gray-600">
        {selectedAssetIds.length} of {assets.length} assets selected
      </div>

      {/* Grouped assets */}
      <div className="space-y-6 max-h-96 overflow-y-auto">
        {Object.entries(groupedAssets).map(([category, categoryAssets]) => (
          <div key={category}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-lg text-gray-900">{category}</h4>
              <button
                onClick={() => selectCategory(category)}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                Select All {category}
              </button>
            </div>
            <div className="space-y-2">
              {categoryAssets.map((asset) => {
                const isSelected = selectedAssetIds.includes(asset.id)
                return (
                  <div
                    key={asset.id}
                    onClick={() => toggleAsset(asset.id)}
                    className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-sm bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleAsset(asset.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="font-bold text-lg text-gray-900">{asset.symbol}</span>
                            <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${getChainColor(asset.chain)}`}>
                              {asset.chain}
                            </span>
                            {asset.type === 'erc721' || asset.type === 'erc1155' ? (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-semibold">
                                NFT
                              </span>
                            ) : null}
                            {asset.type === 'ethscription' ? (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-semibold">
                                ETHSCRIPTION
                              </span>
                            ) : null}
                            {asset.walletProvider && asset.walletProvider !== 'Unknown' ? (
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                                {getWalletProviderName(asset.walletProvider)}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-sm text-gray-600 font-medium">{asset.name}</p>
                          {asset.tokenId && (
                            <p className="text-xs text-gray-500 font-mono mt-1">Token ID: {asset.tokenId}</p>
                          )}
                          {asset.ethscriptionId && (
                            <p className="text-xs text-gray-500 font-mono mt-1 truncate">
                              ID: {asset.ethscriptionId.slice(0, 10)}...{asset.ethscriptionId.slice(-8)}
                            </p>
                          )}
                          {asset.type === 'btc' && asset.metadata?.satsFormatted && (
                            <p className="text-xs text-gray-500 mt-1">
                              {asset.metadata.satsFormatted} SATs
                              {asset.metadata.note && (
                                <span className="block text-xs text-amber-600 mt-1 italic">
                                  ⚠️ {asset.metadata.note}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-lg text-gray-900">{asset.balanceFormatted} {asset.symbol}</p>
                        {asset.imageUrl && (asset.type === 'erc721' || asset.type === 'erc1155' || asset.type === 'ethscription') && (
                          <div className="mt-2">
                            <img 
                              src={asset.imageUrl} 
                              alt={asset.name}
                              className="w-16 h-16 object-cover rounded border border-gray-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </div>
                        )}
                        {asset.type === 'btc' && asset.metadata?.satsFormatted && (
                          <p className="text-xs text-gray-500 mt-1">{asset.metadata.satsFormatted} SATs</p>
                        )}
                        {asset.usdValue && (
                          <p className="text-sm text-gray-600 mt-1">${asset.usdValue.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

