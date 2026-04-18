import { describe, expect, it } from 'vitest'
import { dedupeAssets, formatUnitsSafe, parseJsonIfString } from '@/lib/portfolio-utils'
import type { Asset } from '@/types'

describe('portfolio-utils', () => {
  it('formats large integer balances safely', () => {
    expect(formatUnitsSafe('332906788768429413839', 18)).toBe('332.906788')
    expect(formatUnitsSafe('1750000000000', 8)).toBe('17500')
    expect(formatUnitsSafe('100000000', 8)).toBe('1')
  })

  it('deduplicates assets by id without losing order', () => {
    const assets: Asset[] = [
      {
        id: 'eth-1',
        chain: 'eth',
        type: 'native',
        symbol: 'ETH',
        name: 'Ethereum',
        balance: '1',
        balanceFormatted: '1',
      },
      {
        id: 'eth-1',
        chain: 'eth',
        type: 'native',
        symbol: 'ETH',
        name: 'Ethereum',
        balance: '1',
        balanceFormatted: '1',
      },
      {
        id: 'sol-1',
        chain: 'solana',
        type: 'nft',
        symbol: 'NFT',
        name: 'Collectible',
        balance: '1',
        balanceFormatted: '1',
      },
    ]

    expect(dedupeAssets(assets).map(asset => asset.id)).toEqual(['eth-1', 'sol-1'])
  })

  it('parses metadata when it is a JSON string', () => {
    expect(parseJsonIfString('{"name":"Test"}')).toEqual({ name: 'Test' })
    expect(parseJsonIfString({ name: 'Direct' })).toEqual({ name: 'Direct' })
    expect(parseJsonIfString('not-json')).toBeUndefined()
  })
})
