import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json()

    if (!address) {
      return NextResponse.json(
        { error: 'Bitcoin address required' },
        { status: 400 }
      )
    }

    // Using blockstream.info API (public, no key required)
    // In production, you might want to use a more reliable service
    try {
      const response = await fetch(
        `https://blockstream.info/api/address/${address}`
      )

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch Bitcoin balance' },
          { status: 500 }
        )
      }

      const data = await response.json()

      if (!data || typeof data !== 'object') {
        return NextResponse.json({ assets: [] })
      }

      const balance = data.chain_stats?.funded_txo_sum || 0
      const spent = data.chain_stats?.spent_txo_sum || 0
      const netBalance = balance - spent

      if (netBalance === 0) {
        return NextResponse.json({ assets: [] })
      }

      // Convert satoshis to BTC
      const btcBalance = (netBalance / 100000000).toFixed(8)

      return NextResponse.json({
        assets: [
          {
            id: `btc-${address}`,
            chain: 'bitcoin',
            type: 'btc',
            symbol: 'BTC',
            name: 'Bitcoin',
            balance: netBalance.toString(),
            balanceFormatted: btcBalance,
            contractAddress: address,
            walletAddress: address, // Track which wallet this asset belongs to
          },
        ],
      })
    } catch (error) {
      console.error('Error fetching Bitcoin balance:', error)
      return NextResponse.json(
        { error: 'Failed to fetch Bitcoin balance' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in BTC portfolio API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    )
  }
}

