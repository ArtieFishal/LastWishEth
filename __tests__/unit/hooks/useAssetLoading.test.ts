import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAssetLoading } from '@/components/hooks/useAssetLoading'
import axios from 'axios'
import type { Asset } from '@/types'

vi.mock('axios')
const mockedAxios = axios as any

describe('useAssetLoading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useAssetLoading())

    expect(result.current.assets).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.selectedAssetIds).toEqual([])
  })

  it('should load assets from a single wallet', async () => {
    const mockAssets: Asset[] = [
      {
        id: '1',
        name: 'ETH',
        symbol: 'ETH',
        balance: '1.0',
        type: 'native',
        chain: 'ethereum',
        walletAddress: '',
      },
    ]

    mockedAxios.post.mockResolvedValue({
      data: { assets: mockAssets },
    })

    const { result } = renderHook(() => useAssetLoading())

    await act(async () => {
      await result.current.loadAssetsFromWallet('0x123', false, 'MetaMask')
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.assets).toHaveLength(1)
    expect(result.current.assets[0].walletAddress).toBe('0x123')
    expect(result.current.assets[0].walletProvider).toBe('MetaMask')
    expect(mockedAxios.post).toHaveBeenCalledWith('/api/portfolio/evm', {
      addresses: ['0x123'],
    })
  })

  it('should append assets when append is true', async () => {
    const mockAssets1: Asset[] = [
      {
        id: '1',
        name: 'ETH',
        symbol: 'ETH',
        balance: '1.0',
        type: 'native',
        chain: 'ethereum',
        walletAddress: '',
      },
    ]

    const mockAssets2: Asset[] = [
      {
        id: '2',
        name: 'USDC',
        symbol: 'USDC',
        balance: '100.0',
        type: 'token',
        chain: 'ethereum',
        walletAddress: '',
      },
    ]

    mockedAxios.post
      .mockResolvedValueOnce({ data: { assets: mockAssets1 } })
      .mockResolvedValueOnce({ data: { assets: mockAssets2 } })

    const { result } = renderHook(() => useAssetLoading())

    await act(async () => {
      await result.current.loadAssetsFromWallet('0x123', false)
    })

    await act(async () => {
      await result.current.loadAssetsFromWallet('0x456', true)
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.assets).toHaveLength(2)
  })

  it('should filter duplicate assets by id', async () => {
    const mockAssets: Asset[] = [
      {
        id: '1',
        name: 'ETH',
        symbol: 'ETH',
        balance: '1.0',
        type: 'native',
        chain: 'ethereum',
        walletAddress: '',
      },
    ]

    mockedAxios.post.mockResolvedValue({
      data: { assets: mockAssets },
    })

    const { result } = renderHook(() => useAssetLoading())

    await act(async () => {
      await result.current.loadAssetsFromWallet('0x123', false)
    })

    await act(async () => {
      await result.current.loadAssetsFromWallet('0x456', true)
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Should only have one asset since they have the same id
    expect(result.current.assets).toHaveLength(1)
  })

  it('should handle loading errors', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useAssetLoading())

    await act(async () => {
      await result.current.loadAssetsFromWallet('0x123', false)
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load EVM assets. Please try again.')
    expect(result.current.assets).toEqual([])
  })

  it('should load assets from multiple wallets', async () => {
    const mockAssets1: Asset[] = [
      {
        id: '1',
        name: 'ETH',
        symbol: 'ETH',
        balance: '1.0',
        type: 'native',
        chain: 'ethereum',
        walletAddress: '',
      },
    ]

    const mockAssets2: Asset[] = [
      {
        id: '2',
        name: 'USDC',
        symbol: 'USDC',
        balance: '100.0',
        type: 'token',
        chain: 'ethereum',
        walletAddress: '',
      },
    ]

    mockedAxios.post
      .mockResolvedValueOnce({ data: { assets: mockAssets1 } })
      .mockResolvedValueOnce({ data: { assets: mockAssets2 } })

    const { result } = renderHook(() => useAssetLoading())

    await act(async () => {
      await result.current.loadAssetsFromMultipleWallets(
        ['0x123', '0x456'],
        false,
        { '0x123': 'MetaMask', '0x456': 'WalletConnect' }
      )
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.assets).toHaveLength(2)
    expect(mockedAxios.post).toHaveBeenCalledTimes(2)
  })

  it('should load Bitcoin assets', async () => {
    const mockAssets: Asset[] = [
      {
        id: 'btc-1',
        name: 'Bitcoin',
        symbol: 'BTC',
        balance: '0.5',
        type: 'native',
        chain: 'bitcoin',
        walletAddress: '',
      },
    ]

    mockedAxios.post.mockResolvedValue({
      data: { assets: mockAssets },
    })

    const { result } = renderHook(() => useAssetLoading())

    await act(async () => {
      await result.current.loadBitcoinAssets('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', false)
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.assets).toHaveLength(1)
    expect(mockedAxios.post).toHaveBeenCalledWith('/api/portfolio/btc', {
      address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    })
  })

  it('should clear assets', () => {
    const { result } = renderHook(() => useAssetLoading())

    act(() => {
      result.current.setAssets([
        {
          id: '1',
          name: 'ETH',
          symbol: 'ETH',
          balance: '1.0',
          type: 'native',
          chain: 'ethereum',
          walletAddress: '',
        },
      ])
      result.current.setSelectedAssetIds(['1'])
    })

    expect(result.current.assets).toHaveLength(1)

    act(() => {
      result.current.clearAssets()
    })

    expect(result.current.assets).toEqual([])
    expect(result.current.selectedAssetIds).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('should update loading progress', async () => {
    const mockAssets: Asset[] = [
      {
        id: '1',
        name: 'ETH',
        symbol: 'ETH',
        balance: '1.0',
        type: 'native',
        chain: 'ethereum',
        walletAddress: '',
      },
    ]

    mockedAxios.post.mockResolvedValue({
      data: { assets: mockAssets },
    })

    const { result } = renderHook(() => useAssetLoading())

    act(() => {
      result.current.loadAssetsFromWallet('0x123', false)
    })

    // Loading should be true during the request
    expect(result.current.loading).toBe(true)
    expect(result.current.loadingProgress.total).toBe(1)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })
})

