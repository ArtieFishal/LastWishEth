import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimiter'
import { dedupeAssets, fetchJsonWithRetry, firstDefinedString } from '@/lib/portfolio-utils'
import { isBitcoinAddress } from '@/lib/address-utils'
import type { Asset } from '@/types'

interface OrdinalApiConfig {
  name: string
  buildUrl: (address: string, page: number) => string
  extract: (data: any) => any[]
  hasMore?: (data: any, items: any[], page: number) => boolean
}

async function safeFetchJson(url: string) {
  return fetchJsonWithRetry<any>(url, {
    retries: 2,
    timeoutMs: 12000,
    headers: {
      'User-Agent': 'LastWish/1.0',
    },
  })
}

async function fetchBlockstreamAddress(address: string) {
  return safeFetchJson(`https://blockstream.info/api/address/${address}`)
}

async function fetchBlockstreamUtxos(address: string) {
  try {
    const data = await safeFetchJson(`https://blockstream.info/api/address/${address}/utxo`)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function fetchPaginatedInscriptions(address: string, config: OrdinalApiConfig, maxPages = 10): Promise<any[]> {
  const items: any[] = []
  const seen = new Set<string>()

  for (let page = 1; page <= maxPages; page++) {
    try {
      const data = await safeFetchJson(config.buildUrl(address, page))
      const pageItems = config.extract(data)
      if (pageItems.length === 0) break

      for (const item of pageItems) {
        const id = String(
          item?.id ||
          item?.inscription_id ||
          item?.inscriptionId ||
          item?.number ||
          `${item?.txid || item?.tx_id || 'unknown'}-${item?.vout || item?.output || 0}`
        )

        if (!seen.has(id)) {
          seen.add(id)
          items.push(item)
        }
      }

      const shouldContinue = config.hasMore ? config.hasMore(data, pageItems, page) : pageItems.length > 0
      if (!shouldContinue) break
    } catch (error: any) {
      console.warn(`[BTC API] ${config.name} inscription fetch failed on page ${page}:`, error?.message || error)
      break
    }
  }

  return items
}

async function fetchInscriptionsByUtxo(utxos: any[]): Promise<any[]> {
  const items: any[] = []
  const seen = new Set<string>()

  for (const utxo of utxos.slice(0, 50)) {
    const outpoint = `${utxo.txid}:${utxo.vout}`
    const urls = [
      `https://api.hiro.so/ordinals/v1/inscriptions?output=${outpoint}`,
      `https://api.ordinalsbot.com/api/inscriptions?output=${outpoint}`,
    ]

    for (const url of urls) {
      try {
        const data = await safeFetchJson(url)
        const inscriptions = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : Array.isArray(data?.inscriptions)
              ? data.inscriptions
              : []

        for (const item of inscriptions) {
          const id = String(item?.id || item?.inscription_id || item?.inscriptionId || '')
          if (id && !seen.has(id)) {
            seen.add(id)
            items.push(item)
          }
        }
      } catch {
        continue
      }
    }
  }

  return items
}

function normalizeOrdinalAsset(address: string, inscription: any, index: number): Asset {
  const inscriptionId = String(
    inscription?.id ||
    inscription?.inscription_id ||
    inscription?.inscriptionId ||
    inscription?.number ||
    `ordinal-${index}`
  )

  const name = firstDefinedString(
    inscription?.name,
    inscription?.title,
    inscription?.meta?.name,
    `Ordinal #${inscriptionId}`
  ) || `Ordinal #${inscriptionId}`

  const contentType = firstDefinedString(
    inscription?.content_type,
    inscription?.mime_type,
    inscription?.mime,
    inscription?.meta?.mime,
    'unknown'
  ) || 'unknown'

  const contentUrl = firstDefinedString(
    inscription?.content_url,
    inscription?.media_url,
    inscription?.preview_url,
    inscription?.image,
    inscription?.content,
    inscription?.meta?.image,
    `https://ord.io/content/${inscriptionId}`
  )

  return {
    id: `ordinal-${inscriptionId}-${address}`,
    chain: 'bitcoin',
    type: 'ordinal',
    symbol: 'ORD',
    name,
    balance: '1',
    balanceFormatted: '1',
    decimals: 0,
    contractAddress: address,
    walletAddress: address,
    tokenId: inscriptionId,
    imageUrl: `/api/ordinal-image?id=${encodeURIComponent(inscriptionId)}`,
    contentUri: contentUrl,
    metadata: {
      inscriptionId,
      contentType,
      contentUrl,
      assetType: 'ordinal',
      number: inscription?.number || inscription?.inscription_number || null,
      txid: inscription?.txid || inscription?.tx_id || null,
      vout: inscription?.vout || null,
      output: inscription?.output || null,
      ...inscription,
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitKey = `btc-portfolio:${ip}`
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
    const normalizedAddress = String(address || '').trim()

    if (!normalizedAddress) {
      return NextResponse.json({ error: 'Bitcoin address required' }, { status: 400 })
    }

    if (!isBitcoinAddress(normalizedAddress)) {
      return NextResponse.json({ error: 'Invalid Bitcoin address' }, { status: 400 })
    }

    const [addressData, utxos] = await Promise.all([
      fetchBlockstreamAddress(normalizedAddress),
      fetchBlockstreamUtxos(normalizedAddress),
    ])

    if (!addressData || typeof addressData !== 'object') {
      return NextResponse.json({ assets: [] })
    }

    const funded = Number(addressData.chain_stats?.funded_txo_sum || 0)
    const spent = Number(addressData.chain_stats?.spent_txo_sum || 0)
    const netBalance = Math.max(0, funded - spent)
    const btcBalance = (netBalance / 100000000).toFixed(8)
    const satsFormatted = netBalance.toLocaleString('en-US')

    const ordinalApis: OrdinalApiConfig[] = [
      {
        name: 'Hiro',
        buildUrl: (addr, page) => `https://api.hiro.so/ordinals/v1/inscriptions?address=${addr}&limit=60&offset=${(page - 1) * 60}`,
        extract: data => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [],
        hasMore: (data, items, page) => {
          const total = Number(data?.total || 0)
          return items.length === 60 && (!total || page * 60 < total)
        },
      },
      {
        name: 'Ordinals.com address',
        buildUrl: (addr) => `https://ordinals.com/api/address/${addr}/inscriptions`,
        extract: data => Array.isArray(data?.inscriptions) ? data.inscriptions : Array.isArray(data) ? data : [],
        hasMore: () => false,
      },
      {
        name: 'Ord.io',
        buildUrl: (addr) => `https://api.ord.io/inscriptions?address=${addr}`,
        extract: data => Array.isArray(data?.inscriptions) ? data.inscriptions : Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [],
        hasMore: () => false,
      },
    ]

    const inscriptions: any[] = []
    const inscriptionIds = new Set<string>()

    for (const api of ordinalApis) {
      const apiItems = await fetchPaginatedInscriptions(normalizedAddress, api)
      for (const item of apiItems) {
        const id = String(item?.id || item?.inscription_id || item?.inscriptionId || '')
        if (id && !inscriptionIds.has(id)) {
          inscriptionIds.add(id)
          inscriptions.push(item)
        }
      }
    }

    const utxoInscriptions = await fetchInscriptionsByUtxo(utxos)
    for (const item of utxoInscriptions) {
      const id = String(item?.id || item?.inscription_id || item?.inscriptionId || '')
      if (id && !inscriptionIds.has(id)) {
        inscriptionIds.add(id)
        inscriptions.push(item)
      }
    }

    const assets: Asset[] = inscriptions.map((inscription, index) => normalizeOrdinalAsset(normalizedAddress, inscription, index))

    if (netBalance > 0) {
      assets.push({
        id: `btc-${normalizedAddress}`,
        chain: 'bitcoin',
        type: 'btc',
        symbol: 'BTC',
        name: 'Bitcoin',
        balance: netBalance.toString(),
        balanceFormatted: btcBalance,
        decimals: 8,
        contractAddress: normalizedAddress,
        walletAddress: normalizedAddress,
        metadata: {
          sats: netBalance.toString(),
          satsFormatted,
          assetType: 'regular',
          hasOrdinals: assets.some(asset => asset.type === 'ordinal'),
          ordinalsCount: assets.filter(asset => asset.type === 'ordinal').length,
          note: assets.some(asset => asset.type === 'ordinal')
            ? `This address contains ${assets.filter(asset => asset.type === 'ordinal').length} ordinal(s). Allocate the ordinals separately if you need to preserve rare sats or inscriptions.`
            : 'No ordinals were detected for this address by the current indexers.',
        },
      })
    }

    return NextResponse.json({ assets: dedupeAssets(assets) })
  } catch (error) {
    console.error('Error in BTC portfolio API:', error)
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 })
  }
}
