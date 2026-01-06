import { NextRequest, NextResponse } from 'next/server'

const MORALIS_API_KEY = process.env.MORALIS_API_KEY

export async function POST(request: NextRequest) {
  try {
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
    const chains = ['eth', 'base', 'arbitrum', 'polygon', 'apechain']
    const allAssets = []

    for (const address of addresses) {
      for (const chain of chains) {
        try {
          // Get native balance
          const nativeResponse = await fetch(
            `https://deep-index.moralis.io/api/v2/${address}/balance?chain=${chain}`,
            {
              headers: {
                'X-API-Key': MORALIS_API_KEY,
              },
            }
          )

          if (nativeResponse.ok) {
            try {
              const nativeData = await nativeResponse.json()
              if (nativeData && typeof nativeData === 'object' && nativeData.balance && nativeData.balance !== '0') {
                const balance = nativeData.balance.toString()
                allAssets.push({
                  id: `${chain}-${address}-native`,
                  chain,
                  type: 'native',
                  symbol: chain === 'eth' ? 'ETH' : chain === 'base' ? 'ETH' : chain === 'arbitrum' ? 'ETH' : 'MATIC',
                  name: chain === 'eth' ? 'Ethereum' : chain === 'base' ? 'Base Ethereum' : chain === 'arbitrum' ? 'Arbitrum Ethereum' : 'Polygon',
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
            `https://deep-index.moralis.io/api/v2/${address}/erc20?chain=${chain}`,
            {
              headers: {
                'X-API-Key': MORALIS_API_KEY,
              },
            }
          )

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
            `https://deep-index.moralis.io/api/v2/${address}/nft?chain=${chain}&format=decimal`,
            {
              headers: {
                'X-API-Key': MORALIS_API_KEY,
              },
            }
          )

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
                                nft.normalized_metadata.imageUrl
                    }
                    // Fallback to metadata field
                    if (!imageUrl && nft.metadata && typeof nft.metadata === 'object') {
                      metadata = nft.metadata
                      imageUrl = nft.metadata.image || 
                                nft.metadata.image_url || 
                                nft.metadata.imageUrl
                    }
                    // Store token_uri in metadata for client-side fetching if image not available
                    if (!metadata) {
                      metadata = {}
                    }
                    if (nft.token_uri) {
                      metadata.token_uri = nft.token_uri
                    }
                    
                    allAssets.push({
                      id: `${chain}-${address}-${nft.token_address}-${nft.token_id}`,
                      chain,
                      type: nft.contract_type === 'ERC1155' ? 'erc1155' : 'erc721',
                      symbol: nft.symbol || 'NFT',
                      name: nft.name || 'Unnamed NFT',
                      balance: '1',
                      balanceFormatted: '1',
                      contractAddress: nft.token_address,
                      tokenId: nft.token_id,
                      collectionName: nft.name,
                      walletAddress: address, // Track which wallet this asset belongs to
                      imageUrl, // NFT image URL (may be undefined, will be fetched client-side)
                      metadata: {
                        ...metadata,
                        token_uri: nft.token_uri, // Include token_uri for client-side metadata fetching
                        ...nft, // Include all NFT data for reference
                      },
                    })
                  }
                }
              }
            } catch (error) {
              console.error(`Error parsing NFTs for ${chain}:`, error)
            }
          }
        } catch (error) {
          console.error(`Error fetching ${chain} data for ${address}:`, error)
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

