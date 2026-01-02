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
          walletAddress = data.walletAddress || data.address || null
        }
      } catch (e) {
        // API might not be available yet, try alternative
        console.log('Bankr API not available, trying alternative methods')
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
            walletAddress = clankerData.walletAddress || clankerData.address || null
          }
        } catch (e) {
          console.log('Clanker API not available')
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

