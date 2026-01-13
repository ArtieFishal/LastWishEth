import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimiter'

const HELIUS_API_KEY = process.env.HELIUS_API_KEY
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
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
      return NextResponse.json(
        { error: 'Address required' },
        { status: 400 }
      )
    }

    // Validate Solana address format
    try {
      new PublicKey(address)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid Solana address format' },
        { status: 400 }
      )
    }

    const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
    const publicKey = new PublicKey(address)
    const assets = []

    try {
      // Get SOL balance
      const balance = await connection.getBalance(publicKey)
      const solBalance = balance / 1e9 // Convert lamports to SOL

      if (solBalance > 0) {
        // Get approximate SOL price (can be improved with real price API)
        const solPriceUSD = 150 // Approximate, should use real price API
        assets.push({
          id: `${address}-sol-native`,
          name: 'Solana',
          symbol: 'SOL',
          type: 'native',
          balance: solBalance.toString(),
          balanceFormatted: solBalance.toFixed(9),
          usdValue: solBalance * solPriceUSD,
          contractAddress: null,
          tokenId: null,
          image: null,
          decimals: 9,
          chain: 'solana',
        })
      }

      // Get SPL tokens and NFTs using Helius API (if available) or direct RPC
      let tokensData: any = null
      if (HELIUS_API_KEY) {
        try {
          const tokensResponse = await fetch(
            `https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${HELIUS_API_KEY}`,
            { 
              headers: { 'Accept': 'application/json' },
              signal: AbortSignal.timeout(15000), // 15 second timeout for better reliability
            }
          )

          if (tokensResponse.ok) {
            tokensData = await tokensResponse.json()
            
            // Process SPL tokens
            if (tokensData.tokens && Array.isArray(tokensData.tokens)) {
              for (const token of tokensData.tokens) {
                const balance = parseFloat(token.amount) / Math.pow(10, token.decimals || 9)
                
                // Skip zero balances
                if (balance <= 0) continue
                
                // Check if this is actually an NFT
                // NFTs typically have: balance of 1, decimals 0, and often have metadata/image
                // But be more aggressive - if balance is exactly 1 and decimals is 0, it's likely an NFT
                const decimals = token.decimals || 0
                const isLikelyNFT = balance === 1 && decimals === 0
                
                // Also check for NFT indicators in the token data
                const hasNFTIndicators = token.image || 
                                        token.collection || 
                                        token.description ||
                                        (token.name && !token.symbol) || // NFTs often have names but no symbol
                                        token.uri || // NFT metadata URI
                                        token.metadata // NFT metadata object
                
                if (isLikelyNFT || (balance === 1 && hasNFTIndicators)) {
                  // Treat as NFT
                  assets.push({
                    id: `${address}-nft-${token.mint}`,
                    name: token.name || `NFT #${token.mint.slice(0, 8)}`,
                    symbol: token.symbol || 'NFT',
                    type: 'nft',
                    balance: '1',
                    balanceFormatted: '1',
                    usdValue: 0,
                    contractAddress: token.mint,
                    tokenId: token.mint,
                    image: token.image || null,
                    decimals: 0,
                    chain: 'solana',
                    metadata: {
                      collection: token.collection?.name || token.collection || null,
                      description: token.description || null,
                      uri: token.uri || null,
                    },
                  })
                } else {
                  // Regular SPL token
                  assets.push({
                    id: `${address}-spl-${token.mint}`,
                    name: token.name || 'Unknown Token',
                    symbol: token.symbol || 'UNKNOWN',
                    type: 'spl-token',
                    balance: balance.toString(),
                    balanceFormatted: balance.toFixed(token.decimals || 9),
                    usdValue: 0, // Would need price API for accurate USD value
                    contractAddress: token.mint,
                    tokenId: null,
                    image: token.image || null,
                    decimals: token.decimals || 9,
                    chain: 'solana',
                  })
                }
              }
            }

            // Process NFTs from nfts array
            if (tokensData.nfts && Array.isArray(tokensData.nfts)) {
              for (const nft of tokensData.nfts) {
                // Skip if already added as NFT from tokens array
                if (!assets.some(a => a.contractAddress === nft.mint && a.type === 'nft')) {
                  assets.push({
                    id: `${address}-nft-${nft.mint}`,
                    name: nft.name || `NFT #${nft.mint.slice(0, 8)}`,
                    symbol: 'NFT',
                    type: 'nft',
                    balance: '1',
                    balanceFormatted: '1',
                    usdValue: 0,
                    contractAddress: nft.mint,
                    tokenId: nft.mint,
                    image: nft.image || null,
                    decimals: 0,
                    chain: 'solana',
                    metadata: {
                      collection: nft.collection?.name || null,
                      description: nft.description || null,
                    },
                  })
                }
              }
            }
          }
        } catch (heliusError: any) {
          console.error('[Solana API] Helius error:', heliusError)
          // Fallback to basic RPC calls
        }
      }

      // Also check for NFTs in the nativeBalances or other fields if Helius returns them differently
      // Some Helius responses might have NFTs in different fields
      if (tokensData) {
        // Check for NFTs in any array field that might contain them
        const allNFTs: any[] = []
        if (tokensData.nativeBalances) {
          // Sometimes NFTs are in nativeBalances
          for (const item of Array.isArray(tokensData.nativeBalances) ? tokensData.nativeBalances : []) {
            if (item.mint && (item.image || item.name)) {
              allNFTs.push(item)
            }
          }
        }
        // Add any other potential NFT fields from Helius response
        for (const [key, value] of Object.entries(tokensData)) {
          if (key !== 'tokens' && key !== 'nfts' && Array.isArray(value)) {
            for (const item of value) {
              if (item && item.mint && (item.image || item.name) && !assets.some(a => a.contractAddress === item.mint)) {
                // Check if it's likely an NFT
                const balance = parseFloat(item.amount || item.balance || '0')
                const decimals = item.decimals || 0
                if (balance === 1 && decimals === 0) {
                  allNFTs.push(item)
                }
              }
            }
          }
        }
        
        // Process any additional NFTs found
        for (const nft of allNFTs) {
          if (!assets.some(a => a.contractAddress === nft.mint)) {
            assets.push({
              id: `${address}-nft-${nft.mint}`,
              name: nft.name || `NFT #${nft.mint.slice(0, 8)}`,
              symbol: 'NFT',
              type: 'nft',
              balance: '1',
              balanceFormatted: '1',
              usdValue: 0,
              contractAddress: nft.mint,
              tokenId: nft.mint,
              image: nft.image || null,
              decimals: 0,
              chain: 'solana',
              metadata: {
                collection: nft.collection?.name || null,
                description: nft.description || null,
              },
            })
          }
        }
      }

      // Fallback: Get token accounts via RPC if Helius not available
      if (!HELIUS_API_KEY || assets.length === 0) {
        try {
          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
            programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          })

          for (const account of tokenAccounts.value) {
            const parsedInfo = account.account.data.parsed?.info
            if (parsedInfo) {
              const balance = parseFloat(parsedInfo.tokenAmount?.uiAmountString || '0')
              if (balance > 0) {
                // Check if we already added this token (from Helius)
                const mint = parsedInfo.mint
                if (!assets.some(a => a.contractAddress === mint)) {
                  assets.push({
                    id: `${address}-spl-${mint}`,
                    name: 'SPL Token',
                    symbol: 'SPL',
                    type: 'spl-token',
                    balance: balance.toString(),
                    balanceFormatted: balance.toString(),
                    usdValue: 0,
                    contractAddress: mint,
                    tokenId: null,
                    image: null,
                    decimals: parsedInfo.tokenAmount?.decimals || 9,
                    chain: 'solana',
                  })
                }
              }
            }
          }
        } catch (rpcError: any) {
          console.error('[Solana API] RPC token accounts error:', rpcError)
          // Continue with what we have (SOL balance)
        }
      }

      return NextResponse.json({
        assets,
        address,
        chain: 'solana',
      })

    } catch (error: any) {
      console.error('[Solana API] Error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch Solana assets' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('[Solana API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

