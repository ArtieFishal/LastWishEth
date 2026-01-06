import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, isAddress } from 'viem'
import { mainnet } from 'viem/chains'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimiter'

const ETHSCRIPTIONS_API_BASE = 'https://api.ethscriptions.com/v2'

// Retry utility with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3,
  baseDelay = 1000
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        },
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        return response
      }
      
      // If it's a 4xx error (client error), don't retry
      if (response.status >= 400 && response.status < 500) {
        return response
      }
      
      // For 5xx errors or network errors, retry
      if (attempt < retries - 1) {
        const delay = baseDelay * Math.pow(2, attempt) // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      return response
    } catch (error: any) {
      // Network error or timeout
      if (attempt < retries - 1) {
        const delay = baseDelay * Math.pow(2, attempt) // Exponential backoff
        console.log(`[Ethscriptions API] Retry attempt ${attempt + 1}/${retries} after ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }
  
  throw new Error('All retry attempts failed')
}

// Helper function to validate and sanitize image URLs
function validateImageUrl(contentUri: string): string | undefined {
  if (!contentUri || typeof contentUri !== 'string') {
    return undefined
  }

  // Data URIs are valid
  if (contentUri.startsWith('data:')) {
    // Basic validation - data URIs should have a comma
    if (contentUri.includes(',')) {
      return contentUri
    }
    return undefined
  }

  // Handle IPFS URLs
  if (contentUri.includes('ipfs')) {
    // Fix malformed IPFS URLs (ipfs:/Qm... -> ipfs://Qm...)
    let fixedUri = contentUri.replace(/^ipfs:\/(?!\/)/, 'ipfs://')
    
    // Extract IPFS hash (Qm...)
    const ipfsHashMatch = fixedUri.match(/ipfs:\/\/([a-zA-Z0-9]+)/)
    if (ipfsHashMatch && ipfsHashMatch[1]) {
      const hash = ipfsHashMatch[1]
      // Convert to IPFS gateway URL
      return `https://ipfs.io/ipfs/${hash}`
    }
    
    // If it's already a full IPFS gateway URL, validate it
    if (fixedUri.startsWith('https://ipfs.io/ipfs/') || 
        fixedUri.startsWith('https://gateway.pinata.cloud/ipfs/') ||
        fixedUri.startsWith('https://cloudflare-ipfs.com/ipfs/')) {
      return fixedUri
    }
  }

  // Validate HTTP/HTTPS URLs
  if (contentUri.startsWith('http://') || contentUri.startsWith('https://')) {
    try {
      // Try to create a URL object to validate
      const url = new URL(contentUri)
      // Reject if it's just a domain with no path (likely invalid)
      if (url.pathname === '/' && !url.search && !url.hash) {
        return undefined
      }
      return contentUri
    } catch {
      return undefined
    }
  }

  // Reject anything that looks like just a filename (no protocol, no slashes, or just numbers)
  // Examples: "45", "1.png", "image.jpg" - these are invalid
  if (!contentUri.includes('/') && !contentUri.includes(':')) {
    return undefined
  }

  // Reject anything that doesn't look like a valid URL
  return undefined
}

async function resolveENS(ensName: string): Promise<string | null> {
  if (!ensName.endsWith('.eth')) {
    if (isAddress(ensName)) {
      return ensName.toLowerCase()
    }
    return null
  }

  try {
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    })
    const address = await publicClient.getEnsAddress({ name: ensName })
    return address ? address.toLowerCase() : null
  } catch (error) {
    console.error(`Error resolving ENS "${ensName}":`, error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 30 requests per minute per IP
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const rateLimitKey = `ethscriptions-portfolio:${ip}`
    const rateLimit = checkRateLimit(rateLimitKey, {
      windowMs: 60 * 1000, // 1 minute
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
      return NextResponse.json(
        { error: 'Addresses array required' },
        { status: 400 }
      )
    }

    const allAssets = []

    for (const inputAddress of addresses) {
      try {
        // Resolve ENS if needed
        const address = await resolveENS(inputAddress)
        if (!address) {
          console.warn(`[Ethscriptions API] Could not resolve address/ENS: ${inputAddress}`)
          continue
        }

        console.log(`[Ethscriptions API] Fetching ethscriptions for ${inputAddress} -> ${address}`)

        // Fetch ethscriptions - query by BOTH current_owner AND creator
        // Users want to see ethscriptions they created, even if they transferred them
        let allEthscriptionsForAddress: any[] = []
        const seenIds = new Set<string>() // Track to avoid duplicates
        
        // Helper function to fetch and deduplicate
        const fetchEthscriptions = async (queryParam: string, queryType: string) => {
          let page = 1
          let hasMore = true
          const maxPages = 10
          const results: any[] = []
          
          while (hasMore && page <= maxPages) {
            try {
              const response = await fetchWithRetry(
                `${ETHSCRIPTIONS_API_BASE}/ethscriptions?${queryParam}=${address}&page=${page}`,
                {},
                3, // 3 retries
                1000 // 1 second base delay
              )

              if (!response.ok) {
                if (page === 1) {
                  console.error(`[Ethscriptions API] Error fetching ethscriptions (${queryType}) for ${address}: ${response.status} ${response.statusText}`)
                }
                // If it's a client error (4xx), don't retry pages
                if (response.status >= 400 && response.status < 500) {
                  break
                }
                // For server errors (5xx), break and let outer retry handle it
                if (page === 1) {
                  break
                }
                break
              }

              const data = await response.json()
              const ethscriptions = data?.result || []
              const pagination = data?.pagination || {}
              
              console.log(`[Ethscriptions API] Page ${page} (${queryType}): Received ${ethscriptions.length} ethscriptions`)
              
              // Deduplicate by transaction_hash
              for (const eth of ethscriptions) {
                const id = eth.transaction_hash
                if (id && !seenIds.has(id)) {
                  seenIds.add(id)
                  results.push(eth)
                }
              }

              hasMore = pagination.has_more === true || 
                       (pagination.page && pagination.total_pages && pagination.page < pagination.total_pages)
              
              if (!hasMore || ethscriptions.length === 0) {
                break
              }
              
              page++
            } catch (error) {
              console.error(`[Ethscriptions API] Error fetching page ${page} (${queryType}):`, error)
              break
            }
          }
          
          return results
        }

        // Fetch by current_owner
        const ownedEthscriptions = await fetchEthscriptions('address', 'current_owner')
        console.log(`[Ethscriptions API] Found ${ownedEthscriptions.length} ethscriptions as current_owner`)
        
        // Fetch by creator (to get ethscriptions user created, even if transferred)
        const createdEthscriptions = await fetchEthscriptions('creator', 'creator')
        console.log(`[Ethscriptions API] Found ${createdEthscriptions.length} ethscriptions as creator`)
        
        // Combine and deduplicate
        allEthscriptionsForAddress = [...ownedEthscriptions, ...createdEthscriptions]
        
        console.log(`[Ethscriptions API] Total unique ethscriptions found: ${allEthscriptionsForAddress.length} (${ownedEthscriptions.length} owned + ${createdEthscriptions.length} created)`)

        // Process all ethscriptions found
        if (allEthscriptionsForAddress.length > 0) {
          for (const ethscription of allEthscriptionsForAddress) {
            if (ethscription && typeof ethscription === 'object') {
              // Extract fields from API response
              const ethscriptionId = ethscription.transaction_hash
              const contentUri = ethscription.content_uri
              const mimetype = ethscription.mimetype || 'unknown'
              const ethscriptionNumber = ethscription.ethscription_number
              const creator = ethscription.creator?.toLowerCase()
              const currentOwner = ethscription.current_owner?.toLowerCase()
              const addressLower = address.toLowerCase()
              
              // Verify this ethscription belongs to our address (either as creator or current_owner)
              const isCreator = creator === addressLower
              const isOwner = currentOwner === addressLower
              
              console.log(`[Ethscriptions API] Checking ethscription ${ethscriptionId}:`, {
                address,
                addressLower,
                creator,
                currentOwner,
                isCreator,
                isOwner
              })
              
              // The API filters by current_owner, so if it returns an ethscription for this address,
              // it means the address is the current_owner. We should trust the API and include it.
              // However, we log if there's a mismatch for debugging.
              if (!isCreator && !isOwner) {
                console.warn(`[Ethscriptions API] WARNING: Ethscription owner/creator doesn't match queried address, but API returned it`, {
                  queriedAddress: address,
                  creator,
                  currentOwner,
                  note: 'Including anyway since API returned it for this address'
                })
              }
              
              console.log(`[Ethscriptions API] ✅ Including ethscription ${ethscriptionId} (isCreator: ${isCreator}, isOwner: ${isOwner})`)
              
              // Use the queried address as walletAddress to ensure proper filtering in the UI
              // This is critical - the UI filters by walletAddress, so it must match the queried address
              const walletAddress = addressLower
              
              // Determine name and symbol based on mimetype
              let name = 'Ethscription'
              let symbol = 'ETHSCRIPTION'
              
              if (mimetype.startsWith('image/')) {
                name = `Ethscription Image #${ethscriptionNumber}`
                symbol = 'IMG'
              } else if (mimetype.startsWith('text/')) {
                name = `Ethscription Text #${ethscriptionNumber}`
                symbol = 'TXT'
              } else if (mimetype.includes('json')) {
                name = `Ethscription JSON #${ethscriptionNumber}`
                symbol = 'JSON'
              } else {
                name = `Ethscription #${ethscriptionNumber}`
              }

              // Get image URL if it's an image - validate it first
              let imageUrl: string | undefined
              if (mimetype.startsWith('image/') && contentUri) {
                imageUrl = validateImageUrl(contentUri)
              }

              allAssets.push({
                id: `ethscription-${walletAddress}-${ethscriptionId}`,
                chain: 'eth',
                type: 'ethscription',
                symbol,
                name,
                balance: '1',
                balanceFormatted: '1',
                walletAddress: walletAddress, // Use actual owner/creator address
                ethscriptionId,
                contentUri,
                imageUrl,
                metadata: {
                  mimetype,
                  mediaType: ethscription.media_type,
                  mimeSubtype: ethscription.mime_subtype,
                  creator: ethscription.creator,
                  currentOwner: ethscription.current_owner,
                  blockNumber: ethscription.block_number,
                  blockTimestamp: ethscription.block_timestamp,
                  transactionHash: ethscription.transaction_hash,
                  ethscriptionNumber: ethscriptionNumber,
                  isCreator,
                  isOwner,
                  ...ethscription,
                },
              })
            }
          }
        } else {
          console.log(`[Ethscriptions API] No ethscriptions found for ${address} (empty result)`)
        }
      } catch (error) {
        console.error(`[Ethscriptions API] Error processing ethscriptions for ${inputAddress}:`, error)
        if (error instanceof Error) {
          console.error(`[Ethscriptions API] Error details: ${error.message}`, error.stack)
        }
      }
    }
    
    console.log(`[Ethscriptions API] Total ethscriptions found: ${allAssets.length}`)

    return NextResponse.json({ assets: allAssets })
  } catch (error) {
    console.error('Error in ethscriptions portfolio API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ethscriptions' },
      { status: 500 }
    )
  }
}

