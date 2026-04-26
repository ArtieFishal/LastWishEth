import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimiter'
import { dedupeAssets, fetchJsonWithRetry, firstDefinedString, formatUnitsSafe, parseJsonIfString } from '@/lib/portfolio-utils'
import { isEvmAddress } from '@/lib/address-utils'
import { MissingEnvVarError, requireServerEnv } from '@/lib/env.server'
import type { Asset } from '@/types'

const MORALIS_BASE_URL = 'https://deep-index.moralis.io/api/v2'
const CHAINS = ['eth', 'base', 'arbitrum', 'polygon', 'apechain'] as const

const NATIVE_TOKEN_META: Record<string, { symbol: string; name: string; decimals: number }> = {
  eth: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  base: { symbol: 'ETH', name: 'Base Ethereum', decimals: 18 },
  arbitrum: { symbol: 'ETH', name: 'Arbitrum Ethereum', decimals: 18 },
  polygon: { symbol: 'MATIC', name: 'Polygon', decimals: 18 },
  apechain: { symbol: 'APE', name: 'ApeCoin', decimals: 18 },
}

async function moralisFetch<T = any>(url: string): Promise<T> {
  const moralisApiKey = requireServerEnv('MORALIS_API_KEY')
  return fetchJsonWithRetry<T>(url, {
    headers: {
      'X-API-Key': moralisApiKey,
    },
    retries: 2,
    timeoutMs: 15000,
  })
}

async function fetchNativeAsset(address: string, chain: string): Promise<Asset[]> {
  try {
    const data = await moralisFetch<any>(`${MORALIS_BASE_URL}/${address}/balance?chain=${chain}`)
    const rawBalance = String(data?.balance || '0')

    if (rawBalance === '0') return []

    const token = NATIVE_TOKEN_META[chain] || { symbol: 'ETH', name: chain.toUpperCase(), decimals: 18 }

    return [{
      id: `${chain}-${address}-native`,
      chain,
      type: 'native',
      symbol: token.symbol,
      name: token.name,
      balance: rawBalance,
      balanceFormatted: formatUnitsSafe(rawBalance, token.decimals),
      decimals: token.decimals,
      walletAddress: address,
    }]
  } catch (error: any) {
    console.warn(`[EVM Portfolio API] Failed native balance for ${chain} ${address}:`, error?.message || error)
    return []
  }
}

async function fetchErc20Assets(address: string, chain: string): Promise<Asset[]> {
  try {
    const data = await moralisFetch<any>(`${MORALIS_BASE_URL}/${address}/erc20?chain=${chain}`)
    const tokens = Array.isArray(data)
      ? data
      : Array.isArray(data?.result)
        ? data.result
        : Array.isArray(data?.data)
          ? data.data
          : []

    return tokens
      .filter((token: any) => token?.token_address && token?.balance && token.balance !== '0')
      .map((token: any) => {
        const decimals = Number.parseInt(String(token.decimals || '18'), 10)
        const safeDecimals = Number.isFinite(decimals) ? decimals : 18
        return {
          id: `${chain}-${address}-${token.token_address}`,
          chain,
          type: 'erc20',
          symbol: token.symbol || 'UNKNOWN',
          name: token.name || 'Unknown Token',
          balance: String(token.balance),
          balanceFormatted: formatUnitsSafe(String(token.balance), safeDecimals),
          contractAddress: token.token_address,
          decimals: safeDecimals,
          walletAddress: address,
          metadata: {
            logo: token.logo,
            thumbnail: token.thumbnail,
            verifiedContract: token.verified_contract,
            possibleSpam: token.possible_spam,
          },
        } satisfies Asset
      })
  } catch (error: any) {
    console.warn(`[EVM Portfolio API] Failed ERC-20 discovery for ${chain} ${address}:`, error?.message || error)
    return []
  }
}

async function fetchNftAssets(address: string, chain: string): Promise<Asset[]> {
  const assets: Asset[] = []
  let cursor: string | undefined
  let page = 0

  while (page < 10) {
    try {
      const query = new URLSearchParams({
        chain,
        format: 'decimal',
        limit: '100',
      })
      if (cursor) query.set('cursor', cursor)

      const data = await moralisFetch<any>(`${MORALIS_BASE_URL}/${address}/nft?${query.toString()}`)
      const nfts = Array.isArray(data)
        ? data
        : Array.isArray(data?.result)
          ? data.result
          : Array.isArray(data?.data)
            ? data.data
            : []

      for (const nft of nfts) {
        if (!nft?.token_address || !nft?.token_id) continue

        const normalizedMetadata = parseJsonIfString<Record<string, any>>(nft.normalized_metadata)
        const rawMetadata = parseJsonIfString<Record<string, any>>(nft.metadata)
        const mergedMetadata = {
          ...(rawMetadata || {}),
          ...(normalizedMetadata || {}),
        }
        const imageUrl = firstDefinedString(
          mergedMetadata.image,
          mergedMetadata.image_url,
          mergedMetadata.imageUrl,
          mergedMetadata.animation_url,
          mergedMetadata.animationUrl,
        )

        assets.push({
          id: `${chain}-${address}-${nft.token_address}-${nft.token_id}`,
          chain,
          type: nft.contract_type === 'ERC1155' ? 'erc1155' : 'erc721',
          symbol: nft.symbol || 'NFT',
          name: nft.name || mergedMetadata.name || 'Unnamed NFT',
          balance: '1',
          balanceFormatted: '1',
          contractAddress: nft.token_address,
          tokenId: String(nft.token_id),
          collectionName: nft.name || mergedMetadata.collection_name || mergedMetadata.collectionName,
          walletAddress: address,
          imageUrl,
          metadata: {
            ...mergedMetadata,
            token_uri: nft.token_uri,
            contract_type: nft.contract_type,
            amount: nft.amount,
            possibleSpam: nft.possible_spam,
          },
        })
      }

      const nextCursor = typeof data?.cursor === 'string' && data.cursor ? data.cursor : undefined
      if (!nextCursor || nextCursor === cursor || nfts.length === 0) {
        break
      }

      cursor = nextCursor
      page += 1
    } catch (error: any) {
      console.warn(`[EVM Portfolio API] Failed NFT discovery for ${chain} ${address}:`, error?.message || error)
      break
    }
  }

  return assets
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitKey = `evm-portfolio:${ip}`
    const rateLimit = checkRateLimit(rateLimitKey, {
      windowMs: 60 * 1000,
      maxRequests: 30,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please wait a moment before trying again.',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit),
        }
      )
    }

    const { addresses } = await request.json()

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json({ error: 'Addresses array required' }, { status: 400 })
    }

    const validAddresses = addresses
      .map((address: unknown) => String(address || '').trim().toLowerCase())
      .filter(address => isEvmAddress(address))

    if (validAddresses.length === 0) {
      return NextResponse.json({ error: 'No valid EVM addresses provided' }, { status: 400 })
    }

    const allAssets: Asset[] = []

    for (const address of validAddresses) {
      for (const chain of CHAINS) {
        const [nativeAssets, erc20Assets, nftAssets] = await Promise.all([
          fetchNativeAsset(address, chain),
          fetchErc20Assets(address, chain),
          fetchNftAssets(address, chain),
        ])

        allAssets.push(...nativeAssets, ...erc20Assets, ...nftAssets)
      }
    }

    return NextResponse.json({ assets: dedupeAssets(allAssets) })
  } catch (error: any) {
    if (error instanceof MissingEnvVarError) {
      return NextResponse.json(
        {
          error: `Server configuration error: ${error.message}`,
          missing: [error.varName],
        },
        { status: 500 }
      )
    }

    console.error('Error in EVM portfolio API:', error)
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 })
  }
}
