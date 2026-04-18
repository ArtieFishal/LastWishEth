import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimiter'
import { dedupeAssets, fetchJsonWithRetry, firstDefinedString, formatUnitsSafe } from '@/lib/portfolio-utils'
import type { Asset } from '@/types'

const HELIUS_API_KEY = process.env.HELIUS_API_KEY
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
const HELIUS_RPC_URL = HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}` : null

function parsePositiveNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value || '0'))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function formatTokenBalance(amount: unknown, decimals = 0): string {
  const normalized = String(amount ?? '0').trim()
  if (/^-?\d+$/.test(normalized)) {
    return formatUnitsSafe(normalized, decimals, Math.min(Math.max(decimals, 0), 9))
  }

  const numeric = parsePositiveNumber(normalized)
  if (!numeric) return '0'
  return numeric.toFixed(Math.min(Math.max(decimals, 0), 9)).replace(/0+$/, '').replace(/\.$/, '')
}

async function heliusRpc<T = any>(method: string, params: Record<string, any>): Promise<T> {
  if (!HELIUS_RPC_URL) {
    throw new Error('Helius RPC not configured')
  }

  const response = await fetchJsonWithRetry<any>(HELIUS_RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: method,
      method,
      params,
    }),
    retries: 2,
    timeoutMs: 20000,
  })

  if (response?.error) {
    throw new Error(response.error.message || `Helius RPC error for ${method}`)
  }

  return response?.result as T
}

function isCollectibleInterface(value: unknown): boolean {
  const normalized = String(value || '').toUpperCase()
  return normalized.includes('NFT') || normalized.includes('COLLECTIBLE') || normalized.includes('MPL_CORE')
}

function extractSolanaImage(item: any): string | undefined {
  return firstDefinedString(
    item?.content?.links?.image,
    item?.content?.files?.[0]?.uri,
    item?.content?.metadata?.image,
    item?.metadata?.image,
  )
}

function extractSolanaCollection(item: any): string | undefined {
  return firstDefinedString(
    item?.grouping?.find?.((group: any) => group?.group_key === 'collection')?.group_value,
    item?.content?.metadata?.collection?.name,
    item?.content?.metadata?.collection,
    item?.grouping?.[0]?.group_value,
  )
}

function normalizeDasNft(address: string, item: any): Asset | null {
  if (!item?.id) return null

  const name = firstDefinedString(item?.content?.metadata?.name, item?.metadata?.name, `NFT #${String(item.id).slice(0, 8)}`) || 'NFT'
  const symbol = firstDefinedString(item?.content?.metadata?.symbol, item?.metadata?.symbol, 'NFT') || 'NFT'
  const image = extractSolanaImage(item)

  return {
    id: `${address}-nft-${item.id}`,
    name,
    symbol,
    type: 'nft',
    balance: '1',
    balanceFormatted: '1',
    usdValue: 0,
    contractAddress: String(item.id),
    tokenId: String(item.id),
    image,
    decimals: 0,
    chain: 'solana',
    walletAddress: address,
    metadata: {
      collection: extractSolanaCollection(item),
      description: firstDefinedString(item?.content?.metadata?.description, item?.description),
      compressed: Boolean(item?.compression?.compressed),
      interface: item?.interface || undefined,
      ownershipModel: item?.ownership?.ownership_model || undefined,
      jsonUri: item?.content?.json_uri || undefined,
      links: item?.content?.links || undefined,
    },
  }
}

async function fetchSolanaCollectibles(address: string): Promise<Asset[]> {
  if (!HELIUS_RPC_URL) return []

  const assets: Asset[] = []
  let page = 1
  const limit = 100

  while (page <= 20) {
    const result = await heliusRpc<any>('getAssetsByOwner', {
      ownerAddress: address,
      page,
      limit,
      displayOptions: {
        showCollectionMetadata: true,
        showFungible: false,
      },
    })

    const items = Array.isArray(result?.items) ? result.items : []
    if (items.length === 0) break

    for (const item of items) {
      if (!isCollectibleInterface(item?.interface) && !item?.compression?.compressed && !extractSolanaCollection(item)) {
        continue
      }

      const normalized = normalizeDasNft(address, item)
      if (normalized) {
        assets.push(normalized)
      }
    }

    const total = Number(result?.total || 0)
    if (items.length < limit || (total > 0 && page * limit >= total)) {
      break
    }

    page += 1
  }

  return assets
}

async function fetchHeliusBalances(address: string): Promise<any | null> {
  if (!HELIUS_API_KEY) return null

  try {
    return await fetchJsonWithRetry<any>(`https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${HELIUS_API_KEY}`, {
      retries: 2,
      timeoutMs: 15000,
    })
  } catch (error: any) {
    console.warn('[Solana API] Helius balances fetch failed:', error?.message || error)
    return null
  }
}

function normalizeHeliusFungibles(address: string, balancesData: any, nftIds: Set<string>): Asset[] {
  const tokens = Array.isArray(balancesData?.tokens) ? balancesData.tokens : []
  const assets: Asset[] = []

  for (const token of tokens) {
    const mint = String(token?.mint || token?.address || '').trim()
    if (!mint) continue
    if (nftIds.has(mint.toLowerCase())) continue

    const decimals = Number.isFinite(Number(token?.decimals)) ? Number(token.decimals) : 0
    const rawAmount = token?.amount ?? token?.balance ?? '0'
    const balanceFormatted = formatTokenBalance(rawAmount, decimals)
    const numericBalance = parsePositiveNumber(balanceFormatted)

    if (!numericBalance) continue

    const looksLikeNft = decimals === 0 && String(rawAmount) === '1' && !!firstDefinedString(token?.image, token?.collection?.name, token?.description, token?.uri)
    if (looksLikeNft) continue

    assets.push({
      id: `${address}-spl-${mint}`,
      name: token?.name || 'Unknown Token',
      symbol: token?.symbol || 'UNKNOWN',
      type: 'spl-token',
      balance: String(rawAmount),
      balanceFormatted,
      usdValue: parsePositiveNumber(token?.price_usd) * numericBalance || 0,
      contractAddress: mint,
      image: typeof token?.image === 'string' ? token.image : undefined,
      decimals,
      chain: 'solana',
      walletAddress: address,
      metadata: {
        collection: firstDefinedString(token?.collection?.name, token?.collection),
        description: firstDefinedString(token?.description),
        uri: token?.uri || undefined,
      },
    })
  }

  return assets
}

async function fetchRpcTokenAssets(connection: Connection, publicKey: PublicKey, address: string): Promise<Asset[]> {
  const assets: Asset[] = []

  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    })

    for (const account of tokenAccounts.value) {
      const parsedInfo = account.account.data.parsed?.info
      if (!parsedInfo?.mint || !parsedInfo?.tokenAmount) continue

      const mint = String(parsedInfo.mint)
      const decimals = Number(parsedInfo.tokenAmount.decimals || 0)
      const rawAmount = String(parsedInfo.tokenAmount.amount || '0')
      if (rawAmount === '0') continue

      const isLikelyNft = decimals === 0 && rawAmount === '1'
      assets.push({
        id: `${address}-${isLikelyNft ? 'nft' : 'spl'}-${mint}`,
        name: isLikelyNft ? `NFT #${mint.slice(0, 8)}` : 'SPL Token',
        symbol: isLikelyNft ? 'NFT' : 'SPL',
        type: isLikelyNft ? 'nft' : 'spl-token',
        balance: rawAmount,
        balanceFormatted: formatUnitsSafe(rawAmount, decimals, Math.min(decimals, 9)),
        usdValue: 0,
        contractAddress: mint,
        tokenId: isLikelyNft ? mint : undefined,
        decimals,
        chain: 'solana',
        walletAddress: address,
      })
    }
  } catch (error: any) {
    console.warn('[Solana API] RPC token fallback failed:', error?.message || error)
  }

  return assets
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitKey = `solana-portfolio:${ip}`
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

    const { address } = await request.json()

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 })
    }

    let publicKey: PublicKey
    try {
      publicKey = new PublicKey(address)
    } catch {
      return NextResponse.json({ error: 'Invalid Solana address format' }, { status: 400 })
    }

    const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
    const normalizedAddress = publicKey.toBase58()
    const assets: Asset[] = []

    try {
      const lamports = await connection.getBalance(publicKey)
      if (lamports > 0) {
        const solBalance = lamports / 1e9
        assets.push({
          id: `${normalizedAddress}-sol-native`,
          name: 'Solana',
          symbol: 'SOL',
          type: 'native',
          balance: lamports.toString(),
          balanceFormatted: solBalance.toFixed(9),
          usdValue: 0,
          decimals: 9,
          chain: 'solana',
          walletAddress: normalizedAddress,
        })
      }

      let collectibleAssets: Asset[] = []
      if (HELIUS_RPC_URL) {
        try {
          collectibleAssets = await fetchSolanaCollectibles(normalizedAddress)
        } catch (error: any) {
          console.warn('[Solana API] DAS collectible discovery failed:', error?.message || error)
        }
      }

      const nftIds = new Set(
        collectibleAssets
          .map(asset => asset.contractAddress?.toLowerCase())
          .filter((value): value is string => Boolean(value))
      )

      const heliusBalances = await fetchHeliusBalances(normalizedAddress)
      if (heliusBalances) {
        assets.push(...normalizeHeliusFungibles(normalizedAddress, heliusBalances, nftIds))
      }

      assets.push(...collectibleAssets)

      if (!HELIUS_API_KEY || assets.length <= (lamports > 0 ? 1 : 0)) {
        const fallbackAssets = await fetchRpcTokenAssets(connection, publicKey, normalizedAddress)
        assets.push(...fallbackAssets)
      }

      return NextResponse.json({
        assets: dedupeAssets(assets),
        address: normalizedAddress,
        chain: 'solana',
      })
    } catch (error: any) {
      console.error('[Solana API] Error:', error)
      return NextResponse.json({ error: error.message || 'Failed to fetch Solana assets' }, { status: 500 })
    }
  } catch (error: any) {
    console.error('[Solana API] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
