'use client'

import { useState } from 'react'
import axios from 'axios'
import { Asset } from '@/types'

export function useAssetLoading() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, wallet: '' })
  const [error, setError] = useState<string | null>(null)
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])

  const loadAssetsFromWallet = async (
    walletAddress: string,
    append = false,
    walletProvider?: string
  ): Promise<Asset[]> => {
    setLoading(true)
    setError(null)
    setLoadingProgress({ current: 0, total: 1, wallet: walletAddress })

    try {
      const evmResponse = await axios.post('/api/portfolio/evm', {
        addresses: [walletAddress],
      })

      if (evmResponse.data?.assets && Array.isArray(evmResponse.data.assets)) {
        const existingIds = new Set(assets.map(a => a.id))
        const newAssets = evmResponse.data.assets
          .filter((a: Asset) => !existingIds.has(a.id))
          .map((a: Asset) => ({
            ...a,
            walletAddress: walletAddress,
            walletProvider: walletProvider || 'Unknown',
          }))

        if (append) {
          setAssets(prev => [...prev, ...newAssets])
          if (newAssets.length > 0) {
            setSelectedAssetIds(prev => [...prev, ...newAssets.map(a => a.id)])
          }
        } else {
          setAssets(newAssets)
          if (newAssets.length > 0) {
            setSelectedAssetIds(newAssets.map(a => a.id))
          }
        }

        setLoadingProgress({ current: 1, total: 1, wallet: walletAddress })
        return newAssets
      }

      return []
    } catch (err) {
      console.error('Error loading EVM assets:', err)
      setError('Failed to load EVM assets. Please try again.')
      return []
    } finally {
      setLoading(false)
      setLoadingProgress({ current: 0, total: 0, wallet: '' })
    }
  }

  const loadAssetsFromMultipleWallets = async (
    walletAddresses: string[],
    append = false,
    walletProviders: Record<string, string> = {}
  ): Promise<Asset[]> => {
    setLoading(true)
    setError(null)
    setLoadingProgress({ current: 0, total: walletAddresses.length, wallet: '' })

    const allNewAssets: Asset[] = []
    const existingIds = new Set(assets.map(a => a.id))

    try {
      // Load all wallets in parallel
      const responses = await Promise.all(
        walletAddresses.map(async (address, index) => {
          setLoadingProgress({ 
            current: index + 1, 
            total: walletAddresses.length, 
            wallet: address 
          })
          
          try {
            const response = await axios.post('/api/portfolio/evm', {
              addresses: [address],
            })
            return { address, assets: response.data?.assets || [] }
          } catch (err) {
            console.error(`Error loading assets from ${address}:`, err)
            return { address, assets: [] }
          }
        })
      )

      // Process all responses
      responses.forEach(({ address, assets: walletAssets }) => {
        if (Array.isArray(walletAssets)) {
          const uniqueAssets = walletAssets
            .filter((a: Asset) => !existingIds.has(a.id))
            .map((a: Asset) => ({
              ...a,
              walletAddress: address,
              walletProvider: walletProviders[address] || 'Unknown',
            }))
          allNewAssets.push(...uniqueAssets)
          uniqueAssets.forEach(a => existingIds.add(a.id))
        }
      })

      if (append) {
        setAssets(prev => [...prev, ...allNewAssets])
        if (allNewAssets.length > 0) {
          setSelectedAssetIds(prev => [...prev, ...allNewAssets.map(a => a.id)])
        }
      } else {
        setAssets(allNewAssets)
        if (allNewAssets.length > 0) {
          setSelectedAssetIds(allNewAssets.map(a => a.id))
        }
      }

      return allNewAssets
    } catch (err) {
      console.error('Error loading assets from multiple wallets:', err)
      setError('Failed to load assets. Please try again.')
      return []
    } finally {
      setLoading(false)
      setLoadingProgress({ current: 0, total: 0, wallet: '' })
    }
  }

  const loadBitcoinAssets = async (btcAddress: string, append = false): Promise<Asset[]> => {
    setLoading(true)
    setError(null)

    try {
      const btcResponse = await axios.post('/api/portfolio/btc', {
        address: btcAddress,
      })

      if (btcResponse.data?.assets && Array.isArray(btcResponse.data.assets)) {
        const existingIds = new Set(assets.map(a => a.id))
        const newAssets = btcResponse.data.assets.filter((a: Asset) => !existingIds.has(a.id))

        if (append) {
          setAssets(prev => [...prev, ...newAssets])
          if (newAssets.length > 0) {
            setSelectedAssetIds(prev => [...prev, ...newAssets.map(a => a.id)])
          }
        } else {
          setAssets(newAssets)
          if (newAssets.length > 0) {
            setSelectedAssetIds(newAssets.map(a => a.id))
          }
        }

        return newAssets
      }

      return []
    } catch (err) {
      console.error('Error loading Bitcoin assets:', err)
      setError('Failed to load Bitcoin assets. Please try again.')
      return []
    } finally {
      setLoading(false)
    }
  }

  const clearAssets = () => {
    setAssets([])
    setSelectedAssetIds([])
    setError(null)
  }

  return {
    assets,
    loading,
    loadingProgress,
    error,
    selectedAssetIds,
    setAssets,
    setSelectedAssetIds,
    setError,
    loadAssetsFromWallet,
    loadAssetsFromMultipleWallets,
    loadBitcoinAssets,
    clearAssets,
  }
}

