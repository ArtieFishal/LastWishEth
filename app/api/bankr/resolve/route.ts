import { NextRequest, NextResponse } from 'next/server'

// Bankr API endpoint to resolve X handle to wallet address
// Based on: https://clanker.world/clanker/0x0c0e3ece3cc1770e3a4943469304a3c93e6b8b07
const BANKR_API_BASE = 'https://api.bankr.bot' // Update with actual Bankr API endpoint

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { xHandle } = body

    if (!xHandle || typeof xHandle !== 'string') {
      return NextResponse.json(
        { error: 'X handle is required' },
        { status: 400 }
      )
    }

    // Remove @ if present
    const cleanHandle = xHandle.replace(/^@/, '').trim().toLowerCase()

    if (!cleanHandle) {
      return NextResponse.json(
        { error: 'Invalid X handle' },
        { status: 400 }
      )
    }

    try {
      // Try Bankr API endpoint (update URL when official API is available)
      // For now, we'll try a few potential endpoints
      let walletAddress: string | null = null
      let error: string | null = null

      // Option 1: Try Bankr's public API if available
      try {
        const response = await fetch(
          `https://api.bankr.bot/v1/resolve?handle=${encodeURIComponent(cleanHandle)}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          console.log('Bankr API response:', data)
          walletAddress = data.walletAddress || data.address || data.wallet || null
        } else {
          console.log(`Bankr API returned ${response.status}: ${response.statusText}`)
        }
      } catch (e: any) {
        // API might not be available yet, try alternative
        console.log('Bankr API not available:', e.message)
      }

      // Option 2: Try Clanker API (mentioned in docs)
      if (!walletAddress) {
        try {
          const clankerResponse = await fetch(
            `https://clanker.world/api/resolve?handle=${encodeURIComponent(cleanHandle)}`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            }
          )

          if (clankerResponse.ok) {
            const clankerData = await clankerResponse.json()
            console.log('Clanker API response:', clankerData)
            walletAddress = clankerData.walletAddress || clankerData.address || clankerData.wallet || null
          } else {
            console.log(`Clanker API returned ${clankerResponse.status}: ${clankerResponse.statusText}`)
          }
        } catch (e: any) {
          console.log('Clanker API not available:', e.message)
        }
      }

      // Option 3: Try alternative endpoint format
      if (!walletAddress) {
        try {
          const altResponse = await fetch(
            `https://bankr.bot/api/wallet/${encodeURIComponent(cleanHandle)}`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            }
          )

          if (altResponse.ok) {
            const altData = await altResponse.json()
            console.log('Alternative API response:', altData)
            walletAddress = altData.walletAddress || altData.address || altData.wallet || null
          }
        } catch (e: any) {
          console.log('Alternative API not available:', e.message)
        }
      }

      if (walletAddress) {
        // Validate it's a valid Ethereum address
        if (walletAddress.startsWith('0x') && walletAddress.length === 42) {
          return NextResponse.json({
            success: true,
            walletAddress: walletAddress.toLowerCase(),
            xHandle: cleanHandle,
          })
        } else {
          return NextResponse.json(
            { error: 'Invalid wallet address returned from API' },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { 
            error: `No Bankr wallet found for X handle: @${cleanHandle}. Make sure your X account is connected to Bankr.`,
            xHandle: cleanHandle,
          },
          { status: 404 }
        )
      }
    } catch (error: any) {
      console.error('Error resolving X handle:', error)
      return NextResponse.json(
        { 
          error: `Failed to resolve X handle: ${error.message || 'Unknown error'}`,
          xHandle: cleanHandle,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in Bankr resolve API:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

