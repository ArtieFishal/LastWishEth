// NFT Metadata fetcher with retries, caching, and IPFS support

interface MetadataCache {
  [key: string]: {
    data: any
    timestamp: number
  }
}

const cache: MetadataCache = {}
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Multiple IPFS gateways for redundancy
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
]

function normalizeIPFS(url: string): string {
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', '')
  }
  if (url.startsWith('ipfs/')) {
    return url.replace('ipfs/', '')
  }
  if (url.includes('/ipfs/')) {
    const parts = url.split('/ipfs/')
    if (parts.length > 1) {
      return parts[1]
    }
  }
  return url
}

function getIPFSGatewayUrl(ipfsHash: string, gatewayIndex = 0): string {
  const hash = normalizeIPFS(ipfsHash)
  const gateway = IPFS_GATEWAYS[gatewayIndex % IPFS_GATEWAYS.length]
  return `${gateway}${hash}`
}

async function fetchWithRetry(
  url: string,
  retries = 3,
  timeout = 10000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json, image/*, */*',
      },
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (retries > 0 && !controller.signal.aborted) {
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000))
      return fetchWithRetry(url, retries - 1, timeout)
    }
    throw error
  }
}

async function fetchIPFSWithFallback(ipfsUrl: string): Promise<Response | null> {
  const hash = normalizeIPFS(ipfsUrl)
  
  // Try each gateway
  for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
    try {
      const gatewayUrl = getIPFSGatewayUrl(hash, i)
      const response = await fetchWithRetry(gatewayUrl, 2, 8000)
      if (response.ok) {
        return response
      }
    } catch (error) {
      // Try next gateway
      continue
    }
  }
  
  return null
}

export async function fetchNFTMetadata(
  tokenUri: string,
  contractAddress?: string,
  tokenId?: string
): Promise<{ image?: string; metadata?: any } | null> {
  if (!tokenUri) {
    return null
  }

  // Create cache key
  const cacheKey = `nft-${contractAddress}-${tokenId}-${tokenUri}`
  
  // Check cache
  if (cache[cacheKey]) {
    const cached = cache[cacheKey]
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
  }

  try {
    let url = tokenUri
    let response: Response | null = null

    // Handle IPFS URLs
    if (tokenUri.startsWith('ipfs://') || tokenUri.startsWith('ipfs/') || tokenUri.includes('/ipfs/')) {
      response = await fetchIPFSWithFallback(tokenUri)
    } else if (tokenUri.startsWith('http://') || tokenUri.startsWith('https://')) {
      // Regular HTTP/HTTPS URL
      response = await fetchWithRetry(tokenUri, 3, 10000)
    } else {
      // Invalid URL format
      console.warn(`[NFT Metadata] Invalid token URI format: ${tokenUri}`)
      return null
    }

    if (!response || !response.ok) {
      console.warn(`[NFT Metadata] Failed to fetch metadata from ${tokenUri}: ${response?.status || 'network error'}`)
      return null
    }

    // Check if it's an image
    const contentType = response.headers.get('content-type') || ''
    if (contentType.startsWith('image/')) {
      // Direct image URL
      const imageUrl = response.url || tokenUri
      const result = { image: imageUrl }
      cache[cacheKey] = { data: result, timestamp: Date.now() }
      return result
    }

    // Try to parse as JSON
    try {
      const metadata = await response.json()
      
      // Extract image URL
      let imageUrl = metadata.image || 
                   metadata.image_url || 
                   metadata.imageUrl ||
                   metadata.animation_url ||
                   metadata.animationUrl

      // Handle IPFS image URLs
      if (imageUrl && (imageUrl.startsWith('ipfs://') || imageUrl.startsWith('ipfs/') || imageUrl.includes('/ipfs/'))) {
        const hash = normalizeIPFS(imageUrl)
        // Use first gateway for now, components can handle fallback
        imageUrl = getIPFSGatewayUrl(hash, 0)
      }

      const result = {
        image: imageUrl,
        metadata: metadata,
      }

      // Cache the result
      cache[cacheKey] = { data: result, timestamp: Date.now() }
      return result
    } catch (parseError) {
      console.warn(`[NFT Metadata] Failed to parse JSON from ${tokenUri}:`, parseError)
      return null
    }
  } catch (error) {
    console.error(`[NFT Metadata] Error fetching metadata from ${tokenUri}:`, error)
    return null
  }
}

// Helper to get image URL with IPFS fallback
export function getImageUrlWithIPFSFallback(imageUrl?: string): string | undefined {
  if (!imageUrl) return undefined

  // Already a valid HTTP URL
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }

  // IPFS URL - convert to gateway
  if (imageUrl.startsWith('ipfs://') || imageUrl.startsWith('ipfs/') || imageUrl.includes('/ipfs/')) {
    const hash = normalizeIPFS(imageUrl)
    return getIPFSGatewayUrl(hash, 0)
  }

  // Data URI
  if (imageUrl.startsWith('data:')) {
    return imageUrl
  }

  return undefined
}

