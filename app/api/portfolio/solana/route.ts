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
      if (HELIUS_API_KEY) {
        try {
          const tokensResponse = await fetch(
            `https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${HELIUS_API_KEY}`,
            { 
              headers: { 'Accept': 'application/json' },
              signal: AbortSignal.timeout(10000), // 10 second timeout
            }
          )

          if (tokensResponse.ok) {
            const tokensData = await tokensResponse.json()
            
            // Process SPL tokens
            if (tokensData.tokens && Array.isArray(tokensData.tokens)) {
              for (const token of tokensData.tokens) {
                const balance = parseFloat(token.amount) / Math.pow(10, token.decimals || 9)
                
                // Skip zero balances
                if (balance <= 0) continue
                
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

            // Process NFTs
            if (tokensData.nfts && Array.isArray(tokensData.nfts)) {
              for (const nft of tokensData.nfts) {
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
        } catch (heliusError: any) {
          console.error('[Solana API] Helius error:', heliusError)
          // Fallback to basic RPC calls
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

