import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, isAddress } from 'viem'
import { mainnet } from 'viem/chains'

const ETHSCRIPTIONS_API_BASE = 'https://api.ethscriptions.com/v2'

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

        // Fetch ethscriptions - query by current_owner (what we're doing now)
        // The API's ?address parameter returns ethscriptions where address is current_owner
        let allEthscriptionsForAddress: any[] = []
        let page = 1
        let hasMore = true
        const maxPages = 10 // Safety limit

        // Fetch all pages for current_owner
        while (hasMore && page <= maxPages) {
          try {
            const response = await fetch(
              `${ETHSCRIPTIONS_API_BASE}/ethscriptions?address=${address}&page=${page}`,
              {
                headers: {
                  'Accept': 'application/json',
                },
              }
            )

            if (!response.ok) {
              if (page === 1) {
                // Only log error on first page
                console.error(`[Ethscriptions API] Error fetching ethscriptions for ${address}: ${response.status} ${response.statusText}`)
                const errorText = await response.text().catch(() => '')
                console.error(`[Ethscriptions API] Error response: ${errorText}`)
              }
              break
            }

            const data = await response.json()
            const ethscriptions = data?.result || []
            const pagination = data?.pagination || {}
            
            console.log(`[Ethscriptions API] Page ${page}: Received ${ethscriptions.length} ethscriptions (current_owner)`)
            
            allEthscriptionsForAddress.push(...ethscriptions)

            // Check if there are more pages
            hasMore = pagination.has_more === true || 
                     (pagination.page && pagination.total_pages && pagination.page < pagination.total_pages)
            
            if (!hasMore || ethscriptions.length === 0) {
              break
            }
            
            page++
          } catch (error) {
            console.error(`[Ethscriptions API] Error fetching page ${page}:`, error)
            break
          }
        }

        console.log(`[Ethscriptions API] Total ethscriptions found as current_owner: ${allEthscriptionsForAddress.length}`)

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
              
              if (!isCreator && !isOwner) {
                console.warn(`[Ethscriptions API] Skipping ethscription ${ethscriptionId}: address mismatch`, {
                  address,
                  addressLower,
                  creator,
                  currentOwner,
                  creatorMatch: creator === addressLower,
                  ownerMatch: currentOwner === addressLower
                })
                continue
              }
              
              console.log(`[Ethscriptions API] ✅ Including ethscription ${ethscriptionId} (isCreator: ${isCreator}, isOwner: ${isOwner})`)
              
              // Use current_owner as the walletAddress (or creator if no current_owner)
              const walletAddress = currentOwner || creator || address
              
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

