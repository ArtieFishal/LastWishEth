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
      
      // Format SATs with commas for readability
      const satsFormatted = netBalance.toLocaleString('en-US')

      const assets: any[] = []
      let ordinalsFound = 0 // Track if we find ordinals

      // Fetch ordinals/inscriptions FIRST to know if we should show the warning
      // Note: Ordinals are typically stored in Taproot addresses (bc1p...), but can also be in other address types
      // Xverse uses separate addresses for ordinals vs payment
      try {
        console.log(`[BTC API] Fetching ordinals for address: ${address}`)
        
        // Get UTXOs first to check for inscriptions
        let utxos: any[] = []
        try {
          const utxoResponse = await fetch(`https://blockstream.info/api/address/${address}/utxo`, {
            headers: { 'Accept': 'application/json' }
          })
          if (utxoResponse.ok) {
            utxos = await utxoResponse.json()
            console.log(`[BTC API] Found ${utxos.length} UTXOs for address`)
          }
        } catch (utxoError) {
          console.log(`[BTC API] Failed to fetch UTXOs:`, utxoError)
        }

        // Try multiple ordinal APIs with different formats
        const ordinalApis = [
          // Hiro API - most reliable
          {
            url: `https://api.hiro.so/ordinals/v1/inscriptions?address=${address}&limit=100`,
            name: 'Hiro',
            extract: (data: any) => {
              if (Array.isArray(data)) return data
              if (data?.results && Array.isArray(data.results)) return data.results
              if (data?.data && Array.isArray(data.data)) return data.data
              return []
            }
          },
          // Ordinals.com API
          {
            url: `https://ordinals.com/api/inscriptions?address=${address}&limit=100`,
            name: 'Ordinals.com',
            extract: (data: any) => {
              if (Array.isArray(data)) return data
              if (data?.inscriptions && Array.isArray(data.inscriptions)) return data.inscriptions
              if (data?.results && Array.isArray(data.results)) return data.results
              return []
            }
          },
          // Ord.io API
          {
            url: `https://api.ord.io/inscriptions?address=${address}&limit=100`,
            name: 'Ord.io',
            extract: (data: any) => {
              if (Array.isArray(data)) return data
              if (data?.inscriptions && Array.isArray(data.inscriptions)) return data.inscriptions
              if (data?.results && Array.isArray(data.results)) return data.results
              return []
            }
          },
          // Gamma API
          {
            url: `https://api.gamma.io/ordinals/v1/inscriptions?address=${address}&limit=100`,
            name: 'Gamma',
            extract: (data: any) => {
              if (Array.isArray(data)) return data
              if (data?.results && Array.isArray(data.results)) return data.results
              return []
            }
          },
        ]

        let allInscriptions: any[] = []
        const seenIds = new Set<string>()

        // Try each API
        for (const api of ordinalApis) {
          try {
            console.log(`[BTC API] Trying ${api.name} API...`)
            const ordinalResponse = await fetch(api.url, {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0',
              },
              // Add timeout
              signal: AbortSignal.timeout(10000), // 10 second timeout
            })

            if (ordinalResponse.ok) {
              const ordinalData = await ordinalResponse.json()
              const inscriptions = api.extract(ordinalData)
              
              console.log(`[BTC API] ${api.name} returned ${inscriptions.length} inscriptions`)
              
              // Add unique inscriptions
              inscriptions.forEach((inscription: any) => {
                const inscriptionId = inscription.id || 
                                     inscription.inscription_id || 
                                     inscription.inscriptionId ||
                                     inscription.number ||
                                     `${inscription.txid}-${inscription.vout || 0}`
                
                if (!seenIds.has(inscriptionId)) {
                  seenIds.add(inscriptionId)
                  allInscriptions.push(inscription)
                }
              })

              // If we got results, log success
              if (inscriptions.length > 0) {
                console.log(`[BTC API] ✅ Successfully fetched ${inscriptions.length} ordinals from ${api.name}`)
              }
            } else {
              console.log(`[BTC API] ${api.name} API returned status ${ordinalResponse.status}`)
            }
          } catch (apiError: any) {
            if (apiError.name === 'AbortError') {
              console.log(`[BTC API] ${api.name} API timeout`)
            } else {
              console.log(`[BTC API] ${api.name} API failed:`, apiError.message)
            }
            // Continue to next API
          }
        }

        // Also check UTXOs for inscriptions (some APIs require UTXO-based queries)
        if (utxos.length > 0 && allInscriptions.length === 0) {
          console.log(`[BTC API] Checking UTXOs for inscriptions...`)
          for (const utxo of utxos.slice(0, 10)) { // Limit to first 10 UTXOs
            try {
              const utxoId = `${utxo.txid}:${utxo.vout}`
              // Try Hiro API with UTXO
              const utxoResponse = await fetch(`https://api.hiro.so/ordinals/v1/inscriptions?output=${utxoId}`, {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(5000),
              })
              if (utxoResponse.ok) {
                const utxoData = await utxoResponse.json()
                const utxoInscriptions = Array.isArray(utxoData) ? utxoData : 
                                        (utxoData?.results || utxoData?.inscriptions || [])
                utxoInscriptions.forEach((inscription: any) => {
                  const inscriptionId = inscription.id || inscription.inscription_id || inscription.inscriptionId
                  if (inscriptionId && !seenIds.has(inscriptionId)) {
                    seenIds.add(inscriptionId)
                    allInscriptions.push(inscription)
                  }
                })
              }
            } catch (utxoError) {
              // Silent fail for UTXO checks
            }
          }
        }

        console.log(`[BTC API] Total unique inscriptions found: ${allInscriptions.length}`)
        ordinalsFound = allInscriptions.length

        // Add each ordinal as a separate asset
        allInscriptions.forEach((inscription: any, index: number) => {
          const inscriptionId = inscription.id || 
                               inscription.inscription_id || 
                               inscription.inscriptionId ||
                               inscription.number ||
                               `ordinal-${index}`
          
          const name = inscription.name || 
                      inscription.title || 
                      inscription.meta?.name ||
                      `Ordinal #${inscriptionId}`
          
          // Extract image/content URL
          const imageUrl = inscription.image || 
                          inscription.content_url || 
                          inscription.media_url || 
                          inscription.preview_url ||
                          inscription.content ||
                          (inscription.meta?.image || inscription.meta?.preview)
          
          // Extract content type
          const contentType = inscription.content_type || 
                             inscription.mime_type || 
                             inscription.meta?.mime ||
                             'unknown'
          
          assets.push({
            id: `ordinal-${inscriptionId}-${address}`,
            chain: 'bitcoin',
            type: 'ordinal',
            symbol: 'ORD',
            name: name,
            balance: '1', // Ordinals are non-fungible (1 unit)
            balanceFormatted: '1',
            decimals: 0,
            contractAddress: address,
            walletAddress: address,
            tokenId: inscriptionId.toString(),
            imageUrl: imageUrl,
            metadata: {
              inscriptionId: inscriptionId.toString(),
              contentType: contentType,
              contentUrl: inscription.content_url || inscription.media_url || imageUrl,
              assetType: 'ordinal',
              number: inscription.number || inscription.inscription_number,
              txid: inscription.txid || inscription.tx_id,
              vout: inscription.vout,
              ...inscription,
            },
          })
        })

        if (allInscriptions.length > 0) {
          console.log(`[BTC API] ✅ Added ${allInscriptions.length} ordinals to assets`)
        } else {
          console.log(`[BTC API] ⚠️ No ordinals found for address ${address}`)
          console.log(`[BTC API] Note: Ordinals are typically stored in Taproot addresses (bc1p...).`)
          console.log(`[BTC API] If using Xverse, ordinals may be in a separate ordinals address.`)
        }
      } catch (ordinalError) {
        console.error('[BTC API] Error fetching ordinals:', ordinalError)
        // Don't fail the whole request if ordinals fail
      }

      // Add regular Bitcoin asset AFTER fetching ordinals (so we know if ordinals were found)
      if (netBalance > 0) {
        // Only show warning if no ordinals were detected
        // If ordinals are found, they're shown as separate assets, so update the message
        const note = ordinalsFound === 0 
          ? 'This balance includes all satoshis. Ordinals and rare SATs are detected and shown separately above. When allocating, consider that rare SATs should be preserved separately from regular Bitcoin.'
          : `This balance includes all satoshis. ${ordinalsFound} ordinal(s) detected and shown separately above. When allocating, consider that rare SATs should be preserved separately from regular Bitcoin.`
        
        assets.push({
          id: `btc-${address}`,
          chain: 'bitcoin',
          type: 'btc',
          symbol: 'BTC',
          name: 'Bitcoin',
          balance: netBalance.toString(), // Balance in satoshis
          balanceFormatted: btcBalance, // Balance in BTC
          decimals: 8, // Bitcoin uses 8 decimals (satoshis)
          contractAddress: address,
          walletAddress: address, // Track which wallet this asset belongs to
          metadata: {
            sats: netBalance.toString(),
            satsFormatted: satsFormatted,
            assetType: 'regular', // regular, ordinal, rare_sat
            note: note,
          },
        })
      }

      return NextResponse.json({ assets })
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

