'use client'

import { useState, useEffect } from 'react'
import { Asset } from '@/types'

interface AssetSearchProps {
  assets: Asset[]
  onFilteredAssetsChange: (filtered: Asset[]) => void
  className?: string
}

export function AssetSearch({ assets, onFilteredAssetsChange, className = '' }: AssetSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterChain, setFilterChain] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'chain'>('name')

  // Get unique chains and types
  const chains = ['all', ...Array.from(new Set(assets.map(a => a.chain)))]
  const types = ['all', ...Array.from(new Set(assets.map(a => a.type)))]

  // Filter and sort assets
  const filteredAssets = assets
    .filter(asset => {
      const matchesSearch = !searchTerm || 
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.chain.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesChain = filterChain === 'all' || asset.chain === filterChain
      const matchesType = filterType === 'all' || asset.type === filterType

      return matchesSearch && matchesChain && matchesType
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return (b.usdValue || 0) - (a.usdValue || 0)
        case 'chain':
          return a.chain.localeCompare(b.chain)
        case 'name':
        default:
          return a.name.localeCompare(b.name)
      }
    })

  // Notify parent of filtered results
  useEffect(() => {
    onFilteredAssetsChange(filteredAssets)
  }, [filteredAssets, onFilteredAssetsChange])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search assets by name, symbol, or chain..."
          className="w-full rounded-lg border-2 border-gray-300 p-3 pl-10 focus:border-blue-500 focus:outline-none transition-colors"
        />
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Chain Filter */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Chain</label>
          <select
            value={filterChain}
            onChange={(e) => setFilterChain(e.target.value)}
            className="w-full rounded-lg border-2 border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {chains.map(chain => (
              <option key={chain} value={chain}>
                {chain === 'all' ? 'All Chains' : chain.charAt(0).toUpperCase() + chain.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full rounded-lg border-2 border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {types.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Types' : type.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'value' | 'chain')}
            className="w-full rounded-lg border-2 border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="name">Name</option>
            <option value="value">Value (High to Low)</option>
            <option value="chain">Chain</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredAssets.length} of {assets.length} assets
      </div>
    </div>
  )
}

