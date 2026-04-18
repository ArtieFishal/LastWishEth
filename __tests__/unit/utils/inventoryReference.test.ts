import { describe, expect, it } from 'vitest'
import { buildInventoryReference, isSelectableInventoryAsset } from '@/lib/inventory-reference'
import type { Asset } from '@/types'

describe('inventory-reference', () => {
  const assets: Asset[] = [
    {
      id: 'wallet1-eth',
      chain: 'eth',
      type: 'native',
      symbol: 'ETH',
      name: 'Ethereum',
      balance: '1000000000000000000',
      balanceFormatted: '1',
      walletAddress: '0xabc1230000000000000000000000000000000000',
    },
    {
      id: 'wallet1-nft-1',
      chain: 'eth',
      type: 'erc721',
      symbol: 'ENS',
      name: 'Ethereum Name Service',
      collectionName: 'Ethereum Name Service',
      balance: '1',
      balanceFormatted: '1',
      walletAddress: '0xabc1230000000000000000000000000000000000',
      tokenId: '1',
    },
    {
      id: 'wallet1-nft-2',
      chain: 'eth',
      type: 'erc721',
      symbol: 'ENS',
      name: 'Ethereum Name Service',
      collectionName: 'Ethereum Name Service',
      balance: '1',
      balanceFormatted: '1',
      walletAddress: '0xabc1230000000000000000000000000000000000',
      tokenId: '2',
    },
    {
      id: 'btc-wallet',
      chain: 'bitcoin',
      type: 'btc',
      symbol: 'BTC',
      name: 'Bitcoin',
      balance: '100000000',
      balanceFormatted: '1',
      walletAddress: 'bc1ptestaddress000000000000000000000000000',
      metadata: {
        hasOrdinals: true,
      },
    },
  ]

  it('groups entries by wallet, chain, and category', () => {
    const result = buildInventoryReference(assets, {
      selectedAssetIds: ['wallet1-nft-1'],
    })

    expect(result.walletCount).toBe(2)
    expect(result.assetCount).toBe(4)
    expect(result.wallets[0].chains[0].categories.some(category => category.name === 'Collectibles')).toBe(true)

    const collectibles = result.wallets[0].chains[0].categories.find(category => category.name === 'Collectibles')
    expect(collectibles?.entries[0].countLabel).toBe('2 items')
    expect(collectibles?.entries[0].selectedCount).toBe(1)
  })

  it('marks BTC balance rows with ordinals as non-selectable', () => {
    expect(isSelectableInventoryAsset(assets[3])).toBe(false)
  })
})
