import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimiter'

const MORALIS_API_KEY = process.env.MORALIS_API_KEY

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 30 requests per minute per IP
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const rateLimitKey = `evm-portfolio:${ip}`
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

    if (!MORALIS_API_KEY) {
      return NextResponse.json(
        { error: 'Moralis API key not configured' },
        { status: 500 }
      )
    }

    // Fetch tokens for all addresses across supported chains
    // Note: Moralis may not support all chains - check their documentation for supported chain identifiers
    // ApeChain might need a different identifier or might not be supported yet
    const chains = ['eth', 'base', 'arbitrum', 'polygon', 'apechain']
    const allAssets = []
    
    // Map chain names to Moralis chain identifiers (in case they differ)
    const chainIdMap: Record<string, string> = {
      'eth': 'eth',
      'base': 'base',
      'arbitrum': 'arbitrum',
      'polygon': 'polygon',
      'apechain': 'apechain', // Try 'apechain', might need 'ape-chain' or not be supported
    }

    for (const address of addresses) {
      for (const chain of chains) {
        try {
          const moralisChainId = chainIdMap[chain] || chain
          console.log(`[EVM Portfolio API] Fetching ${chain} data for ${address} (Moralis ID: ${moralisChainId})`)
          
          // Get native balance
          const nativeResponse = await fetch(
            `https://deep-index.moralis.io/api/v2/${address}/balance?chain=${moralisChainId}`,
            {
              headers: {
                'X-API-Key': MORALIS_API_KEY,
              },
            }
          )
          
          console.log(`[EVM Portfolio API] ${chain} native balance response status:`, nativeResponse.status)
          
          // Log error response for debugging
          if (!nativeResponse.ok) {
            const errorText = await nativeResponse.text().catch(() => 'Unknown error')
            console.warn(`[EVM Portfolio API] ${chain} native balance failed (${nativeResponse.status}):`, errorText.substring(0, 200))
          }

          if (nativeResponse.ok) {
            try {
              const nativeData = await nativeResponse.json()
              if (nativeData && typeof nativeData === 'object' && nativeData.balance && nativeData.balance !== '0') {
                const balance = nativeData.balance.toString()
                // Determine native token symbol and name based on chain
                let symbol = 'ETH'
                let name = 'Ethereum'
                if (chain === 'eth') {
                  symbol = 'ETH'
                  name = 'Ethereum'
                } else if (chain === 'base') {
                  symbol = 'ETH'
                  name = 'Base Ethereum'
                } else if (chain === 'arbitrum') {
                  symbol = 'ETH'
                  name = 'Arbitrum Ethereum'
                } else if (chain === 'polygon') {
                  symbol = 'MATIC'
                  name = 'Polygon'
                } else if (chain === 'apechain') {
                  symbol = 'APE'
                  name = 'ApeCoin'
                }
                
                allAssets.push({
                  id: `${chain}-${address}-native`,
                  chain,
                  type: 'native',
                  symbol,
                  name,
                  balance: balance,
                  balanceFormatted: (parseInt(balance) / 1e18).toFixed(6),
                  contractAddress: undefined,
                  decimals: 18,
                  walletAddress: address, // Track which wallet this asset belongs to
                })
              }
            } catch (error) {
              console.error(`Error parsing native balance for ${chain}:`, error)
            }
          }

          // Get ERC-20 tokens
          const tokensResponse = await fetch(
            `https://deep-index.moralis.io/api/v2/${address}/erc20?chain=${moralisChainId}`,
            {
              headers: {
                'X-API-Key': MORALIS_API_KEY,
              },
            }
          )

          // Log error response for ERC-20 tokens
          if (!tokensResponse.ok) {
            const errorText = await tokensResponse.text().catch(() => 'Unknown error')
            console.warn(`[EVM Portfolio API] ${chain} ERC-20 tokens failed (${tokensResponse.status}):`, errorText.substring(0, 200))
          }
          
          if (tokensResponse.ok) {
            try {
              const tokensData = await tokensResponse.json()
              // Moralis returns an array directly, but handle cases where it might be wrapped
              const tokens = Array.isArray(tokensData) 
                ? tokensData 
                : (tokensData && typeof tokensData === 'object' 
                  ? (tokensData.result || tokensData.data || [])
                  : [])
              if (Array.isArray(tokens)) {
                for (const token of tokens) {
                  if (token && typeof token === 'object' && token.balance && token.balance !== '0') {
                    const decimals = parseInt(token.decimals) || 18
                    const balanceFormatted = (parseInt(token.balance) / Math.pow(10, decimals)).toFixed(6)
                    allAssets.push({
                      id: `${chain}-${address}-${token.token_address}`,
                      chain,
                      type: 'erc20',
                      symbol: token.symbol || 'UNKNOWN',
                      name: token.name || 'Unknown Token',
                      balance: token.balance,
                      balanceFormatted,
                      contractAddress: token.token_address,
                      decimals,
                      walletAddress: address, // Track which wallet this asset belongs to
                    })
                  }
                }
              }
            } catch (error) {
              console.error(`Error parsing ERC-20 tokens for ${chain}:`, error)
            }
          }

          // Get NFTs (ERC-721 and ERC-1155)
          const nftsResponse = await fetch(
            `https://deep-index.moralis.io/api/v2/${address}/nft?chain=${moralisChainId}&format=decimal`,
            {
              headers: {
                'X-API-Key': MORALIS_API_KEY,
              },
            }
          )

          console.log(`[EVM Portfolio API] ${chain} NFTs response status:`, nftsResponse.status)
          
          if (nftsResponse.ok) {
            try {
              const nftsData = await nftsResponse.json()
              // Moralis returns { result: [...] } for NFTs
              const nfts = Array.isArray(nftsData) 
                ? nftsData 
                : (nftsData && typeof nftsData === 'object' 
                  ? (nftsData.result || nftsData.data || [])
                  : [])
              if (Array.isArray(nfts)) {
                console.log(`[EVM Portfolio API] Found ${nfts.length} NFTs on ${chain} for ${address}`)
                for (const nft of nfts) {
                  if (nft && typeof nft === 'object' && nft.token_address && nft.token_id) {
                    // Extract image URL from metadata
                    let imageUrl: string | undefined
                    let metadata: any = undefined
                    
                    // Try to get image from normalized_metadata first (Moralis format)
                    if (nft.normalized_metadata && typeof nft.normalized_metadata === 'object') {
                      metadata = nft.normalized_metadata
                      imageUrl = nft.normalized_metadata.image || 
                                nft.normalized_metadata.image_url || 
                                nft.normalized_metadata.imageUrl ||
                                nft.normalized_metadata.animation_url // Add animation_url as fallback
                    }
                    // Fallback to metadata field
                    if (!imageUrl && nft.metadata) {
                      // If metadata is a string, try to parse it
                      if (typeof nft.metadata === 'string') {
                        try {
                          metadata = JSON.parse(nft.metadata)
                        } catch (e) {
                          console.warn(`[EVM Portfolio API] Failed to parse metadata string for ${chain} NFT ${nft.token_id}:`, e)
                          metadata = {}
                        }
                      } else if (typeof nft.metadata === 'object') {
                        metadata = nft.metadata
                      }
                      
                      if (metadata) {
                        imageUrl = imageUrl || 
                                  metadata.image || 
                                  metadata.image_url || 
                                  metadata.imageUrl ||
                                  metadata.animation_url
                      }
                    }
                    
                    // Store token_uri in metadata for client-side fetching if image not available
                    if (!metadata) {
                      metadata = {}
                    }
                    
                    // Always include token_uri for client-side metadata fetching
                    const tokenUri = nft.token_uri || nft.uri || nft.metadata_uri || metadata.token_uri
                    if (tokenUri) {
                      metadata.token_uri = tokenUri
                    }
                    
                    // Extract better name
                    const nftName = nft.name || 
                                   nft.token_name || 
                                   metadata.name ||
                                   `NFT #${nft.token_id}` || 
                                   'Unnamed NFT'
                    
                    const nftAsset = {
                      id: `${chain}-${address}-${nft.token_address}-${nft.token_id}`,
                      chain,
                      type: nft.contract_type === 'ERC1155' ? 'erc1155' : 'erc721',
                      symbol: nft.symbol || 'NFT',
                      name: nftName,
                      balance: nft.amount || '1',
                      balanceFormatted: nft.amount || '1',
                      contractAddress: nft.token_address,
                      tokenId: nft.token_id,
                      collectionName: nft.name || nft.collection_name || metadata.collection,
                      walletAddress: address, // Track which wallet this asset belongs to
                      imageUrl, // NFT image URL (may be undefined, will be fetched client-side)
                      metadata: {
                        ...metadata,
                        token_uri: tokenUri,
                        collection: nft.collection_name || metadata.collection,
                        description: metadata.description || nft.description,
                        attributes: metadata.attributes || metadata.traits,
                        ...nft, // Include all NFT data for reference
                      },
                    }
                    
                    allAssets.push(nftAsset)
                    
                    // Log for debugging ApeChain specifically
                    if (chain === 'apechain') {
                      console.log(`[EVM Portfolio API] ApeChain NFT found:`, {
                        name: nftAsset.name,
                        contract: nft.token_address,
                        tokenId: nft.token_id,
                        hasImage: !!imageUrl,
                        hasTokenUri: !!tokenUri,
                        imageUrl: imageUrl?.substring(0, 100),
                        tokenUri: tokenUri?.substring(0, 100),
                      })
                    }
                  }
                }
              }
            } catch (error) {
              console.error(`[EVM Portfolio API] Error parsing NFTs for ${chain}:`, error)
            }
          } else {
            const errorText = await nftsResponse.text().catch(() => 'Unknown error')
            console.warn(`[EVM Portfolio API] ${chain} NFTs request failed (${nftsResponse.status}):`, errorText)
          }
        } catch (error: any) {
          console.error(`[EVM Portfolio API] Error fetching ${chain} data for ${address}:`, error.message || error)
        }
      }
    }

    return NextResponse.json({ assets: allAssets })
  } catch (error) {
    console.error('Error in EVM portfolio API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    )
  }
}

